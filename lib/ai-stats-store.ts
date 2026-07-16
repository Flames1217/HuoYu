import { aggregateCodexSessions } from "@/lib/codex-session-summary.mjs";
import { getRedisClient } from "@/lib/settings-store";

const SESSIONS_KEY = process.env.AI_SESSIONS_REDIS_KEY || "huoyu:ai:sessions";

export async function saveCodexSessions(sessions: any[]) {
  const redis = getRedisClient();
  if (!redis) throw new Error("AI 同步需要 Upstash Redis");
  if (!sessions.length) return 0;

  const values = Object.fromEntries(
    sessions.map((session) => [session.id, JSON.stringify(session)]),
  );
  await redis.hset(SESSIONS_KEY, values);
  return sessions.length;
}

export async function getCodexStats(start: string, end: string) {
  const redis = getRedisClient();
  if (!redis) return null;

  const stored =
    await redis.hgetall<Record<string, string | object>>(SESSIONS_KEY);
  const sessions = Object.values(stored || {}).flatMap((value) => {
    try {
      return [typeof value === "string" ? JSON.parse(value) : value];
    } catch {
      return [];
    }
  });
  if (!sessions.length) return null;

  const stats = aggregateCodexSessions(sessions, start, end);
  const inputRate = Number(process.env.AI_INPUT_USD_PER_MILLION);
  const cachedRate = Number(process.env.AI_CACHED_INPUT_USD_PER_MILLION);
  const outputRate = Number(process.env.AI_OUTPUT_USD_PER_MILLION);
  const hasRates = [inputRate, cachedRate, outputRate].every(Number.isFinite);
  const estimatedCostUsd = hasRates
    ? ((stats.inputTokens - stats.cachedInputTokens) * inputRate +
        stats.cachedInputTokens * cachedRate +
        stats.outputTokens * outputRate) /
      1_000_000
    : null;
  return { ...stats, estimatedCostUsd };
}
