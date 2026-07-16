import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { saveCodexSessions } from "@/lib/ai-stats-store";

export const dynamic = "force-dynamic";

function authorized(request: Request) {
  const expected = process.env.AI_SYNC_SECRET || process.env.CRON_SECRET || "";
  const actual =
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  const a = Buffer.from(actual);
  const b = Buffer.from(expected);
  return Boolean(expected && a.length === b.length && timingSafeEqual(a, b));
}

function cleanSession(value: any) {
  if (
    !value ||
    typeof value !== "object" ||
    !/^[\w-]{6,80}$/.test(String(value.id || ""))
  )
    return null;
  const text = (input: unknown, fallback: string) =>
    String(input || fallback).slice(0, 180);
  const number = (input: unknown) =>
    Math.max(0, Number.isFinite(Number(input)) ? Number(input) : 0);
  const daily = Array.isArray(value.daily)
    ? value.daily.slice(-370).flatMap((row: any) => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(String(row?.date || ""))) return [];
        return [
          {
            date: row.date,
            inputTokens: number(row.inputTokens),
            cachedInputTokens: number(row.cachedInputTokens),
            outputTokens: number(row.outputTokens),
            reasoningOutputTokens: number(row.reasoningOutputTokens),
            prompts: number(row.prompts),
          },
        ];
      })
    : [];
  return {
    id: String(value.id),
    project: text(value.project, "Unknown"),
    model: text(value.model, "Unknown"),
    source: text(value.source, "Codex"),
    startedAt: text(value.startedAt, ""),
    updatedAt: text(value.updatedAt, ""),
    daily,
  };
}

export async function POST(request: Request) {
  if (!authorized(request))
    return NextResponse.json({ success: false }, { status: 401 });
  if (Number(request.headers.get("content-length") || 0) > 1_000_000) {
    return NextResponse.json(
      { success: false, message: "Payload too large" },
      { status: 413 },
    );
  }

  try {
    const body = await request.json();
    const sessions = Array.isArray(body?.sessions)
      ? body.sessions.slice(0, 500).map(cleanSession).filter(Boolean)
      : [];
    const saved = await saveCodexSessions(sessions);
    return NextResponse.json({ success: true, saved });
  } catch (error) {
    console.error("[AI sync]", error);
    return NextResponse.json(
      { success: false, message: "Invalid AI sync payload" },
      { status: 400 },
    );
  }
}
