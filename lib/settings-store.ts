import fs from "fs/promises";
import path from "path";
import { Redis } from "@upstash/redis";

const SETTINGS_PATH = path.resolve(process.cwd(), "settings.json");
const SETTINGS_KEY = process.env.SETTINGS_REDIS_KEY || "huoyu:settings";

type Settings = Record<string, any>;

let redisClient: Redis | null | undefined;

function getRedisEnv() {
  return {
    url: process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN,
  };
}

function getRedis() {
  if (redisClient !== undefined) return redisClient;

  const { url, token } = getRedisEnv();
  if (!url || !token) {
    redisClient = null;
    return redisClient;
  }

  redisClient = new Redis({ url, token });
  return redisClient;
}

async function readLocalSettings(defaultSettings: Settings = {}) {
  try {
    const fileContents = await fs.readFile(SETTINGS_PATH, "utf8");
    return JSON.parse(fileContents);
  } catch (error: any) {
    if (error?.code === "ENOENT") return defaultSettings;
    console.error("[SettingsStore] Failed to read local settings.json:", error);
    return defaultSettings;
  }
}

function normalizeStoredSettings(value: unknown, defaultSettings: Settings) {
  if (!value) return null;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return defaultSettings;
    }
  }
  return value as Settings;
}

export async function getSettings(defaultSettings: Settings = {}) {
  const redis = getRedis();

  if (!redis) {
    return readLocalSettings(defaultSettings);
  }

  const storedSettings = normalizeStoredSettings(await redis.get(SETTINGS_KEY), defaultSettings);
  if (storedSettings) return storedSettings;

  const localSettings = await readLocalSettings(defaultSettings);
  await redis.set(SETTINGS_KEY, localSettings);
  return localSettings;
}

export async function saveSettings(settings: Settings) {
  const redis = getRedis();

  if (!redis) {
    if (process.env.VERCEL) {
      throw new Error("Upstash Redis env vars are missing. Check KV_REST_API_URL/KV_REST_API_TOKEN or UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN in Vercel.");
    }

    await fs.writeFile(SETTINGS_PATH, JSON.stringify(settings, null, 2), "utf8");
    return settings;
  }

  await redis.set(SETTINGS_KEY, settings);
  return settings;
}

export async function updateSettings(updater: (settings: Settings) => Settings | Promise<Settings>, defaultSettings: Settings = {}) {
  const currentSettings = await getSettings(defaultSettings);
  const nextSettings = await updater(currentSettings);
  return saveSettings(nextSettings);
}
