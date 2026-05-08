import { Redis } from "@upstash/redis";

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
    if (process.env.VERCEL) {
      throw new Error("Upstash Redis env vars are missing. Check KV_REST_API_URL/KV_REST_API_TOKEN or UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN in Vercel.");
    }

    return defaultSettings;
  }

  const storedSettings = normalizeStoredSettings(await redis.get(SETTINGS_KEY), defaultSettings);
  return storedSettings || defaultSettings;
}

export async function saveSettings(settings: Settings) {
  const redis = getRedis();

  if (!redis) {
    throw new Error("Upstash Redis env vars are missing. Check KV_REST_API_URL/KV_REST_API_TOKEN or UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN.");
  }

  await redis.set(SETTINGS_KEY, settings);
  return settings;
}

export async function updateSettings(updater: (settings: Settings) => Settings | Promise<Settings>, defaultSettings: Settings = {}) {
  const currentSettings = await getSettings(defaultSettings);
  const nextSettings = await updater(currentSettings);
  return saveSettings(nextSettings);
}
