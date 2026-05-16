import { Redis } from "@upstash/redis";

const SETTINGS_KEY = process.env.SETTINGS_REDIS_KEY || "huoyu:settings";
const SETTINGS_CACHE_TTL = 30 * 1000;
const SETTINGS_FETCH_TIMEOUT = 2500;

type Settings = Record<string, any>;

let redisClient: Redis | null | undefined;
let settingsCache: { value: Settings; timestamp: number } | null = null;

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

function withTimeout<T>(promise: Promise<T>, ms: number) {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Redis settings request timed out after ${ms}ms`)), ms);

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

export async function getSettings(defaultSettings: Settings = {}) {
  const now = Date.now();
  if (settingsCache && now - settingsCache.timestamp < SETTINGS_CACHE_TTL) {
    return settingsCache.value;
  }

  const redis = getRedis();

  if (!redis) {
    if (process.env.VERCEL) {
      throw new Error("缺少 Upstash Redis 环境变量，请在 Vercel 中检查 KV_REST_API_URL/KV_REST_API_TOKEN 或 UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN。");
    }

    settingsCache = { value: defaultSettings, timestamp: now };
    return defaultSettings;
  }

  try {
    const storedSettings = normalizeStoredSettings(
      await withTimeout(redis.get(SETTINGS_KEY), SETTINGS_FETCH_TIMEOUT),
      defaultSettings
    );
    const resolvedSettings = storedSettings || defaultSettings;
    settingsCache = { value: resolvedSettings, timestamp: Date.now() };
    return resolvedSettings;
  } catch (error) {
    if (settingsCache) {
      console.warn("[settings-store] Falling back to cached settings:", error);
      return settingsCache.value;
    }

    if (process.env.NODE_ENV !== "production") {
      console.warn("[settings-store] Falling back to default settings:", error);
      settingsCache = { value: defaultSettings, timestamp: Date.now() };
      return defaultSettings;
    }

    throw error;
  }
}

export async function saveSettings(settings: Settings) {
  const redis = getRedis();

  if (!redis) {
    throw new Error("缺少 Upstash Redis 环境变量，请检查 KV_REST_API_URL/KV_REST_API_TOKEN 或 UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN。");
  }

  await redis.set(SETTINGS_KEY, settings);
  settingsCache = { value: settings, timestamp: Date.now() };
  return settings;
}

export async function updateSettings(updater: (settings: Settings) => Settings | Promise<Settings>, defaultSettings: Settings = {}) {
  const currentSettings = await getSettings(defaultSettings);
  const nextSettings = await updater(currentSettings);
  return saveSettings(nextSettings);
}
