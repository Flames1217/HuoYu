import fs from "fs/promises";
import path from "path";
import { Redis } from "@upstash/redis";

const root = process.cwd();
const envPath = path.join(root, ".env.local");
const settingsPath = path.join(root, "settings.json");
const settingsKey = process.env.SETTINGS_REDIS_KEY || "huoyu:settings";

async function loadLocalEnv() {
  try {
    const raw = await fs.readFile(envPath, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;

      const equalsIndex = trimmed.indexOf("=");
      if (equalsIndex === -1) continue;

      const key = trimmed.slice(0, equalsIndex).trim();
      const value = trimmed.slice(equalsIndex + 1).trim().replace(/^["']|["']$/g, "");
      if (key && process.env[key] === undefined) process.env[key] = value;
    }
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

await loadLocalEnv();

const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

if (!redisUrl || !redisToken) {
  throw new Error("Missing Upstash env vars. Run `vercel env pull .env.local --environment=production` first.");
}

const settings = JSON.parse(await fs.readFile(settingsPath, "utf8"));
const redis = new Redis({ url: redisUrl, token: redisToken });

await redis.set(settingsKey, settings);
console.log(`Seeded ${settingsPath} to Upstash key "${settingsKey}".`);
