import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

test("Codex 会话按日期计算累计 Token 增量且不保留提示正文", async () => {
  const { summarizeCodexJsonl } =
    await import("../lib/codex-session-summary.mjs");
  const jsonl = [
    {
      timestamp: "2026-07-15T10:00:00Z",
      type: "session_meta",
      payload: {
        id: "session-1",
        cwd: "F:\\code\\HuoYu",
        originator: "Codex Desktop",
      },
    },
    {
      timestamp: "2026-07-15T10:01:00Z",
      type: "turn_context",
      payload: { model: "gpt-test", cwd: "F:\\code\\HuoYu" },
    },
    {
      timestamp: "2026-07-15T10:02:00Z",
      type: "event_msg",
      payload: { type: "user_message", message: "不能上报的正文" },
    },
    {
      timestamp: "2026-07-15T10:03:00Z",
      type: "event_msg",
      payload: {
        type: "token_count",
        info: {
          total_token_usage: {
            input_tokens: 100,
            cached_input_tokens: 40,
            output_tokens: 20,
            reasoning_output_tokens: 5,
            total_tokens: 120,
          },
        },
      },
    },
    {
      timestamp: "2026-07-16T10:03:00Z",
      type: "event_msg",
      payload: {
        type: "token_count",
        info: {
          total_token_usage: {
            input_tokens: 160,
            cached_input_tokens: 70,
            output_tokens: 35,
            reasoning_output_tokens: 8,
            total_tokens: 195,
          },
        },
      },
    },
  ]
    .map(JSON.stringify)
    .join("\n");

  const summary = summarizeCodexJsonl(jsonl);

  assert.equal(summary.id, "session-1");
  assert.equal(summary.project, "HuoYu");
  assert.equal(summary.model, "gpt-test");
  assert.equal(summary.prompts, 1);
  assert.deepEqual(
    summary.daily.map(({ date, inputTokens, outputTokens }) => ({
      date,
      inputTokens,
      outputTokens,
    })),
    [
      { date: "2026-07-15", inputTokens: 100, outputTokens: 20 },
      { date: "2026-07-16", inputTokens: 60, outputTokens: 15 },
    ],
  );
  assert.doesNotMatch(JSON.stringify(summary), /不能上报的正文/);
});

test("AI 同步接口使用独立密钥并写入 Upstash", async () => {
  const route = await readFile(
    new URL("../app/api/ai-sync/route.ts", import.meta.url),
    "utf8",
  );
  const store = await readFile(
    new URL("../lib/ai-stats-store.ts", import.meta.url),
    "utf8",
  );

  assert.match(route, /AI_SYNC_SECRET/);
  assert.match(route, /timingSafeEqual/);
  assert.match(route, /saveCodexSessions/);
  assert.match(store, /hset/);
  assert.match(store, /aggregateCodexSessions/);
});

test("WakaTime 接口合并 Upstash 中的 Codex 使用量", async () => {
  const route = await readFile(
    new URL("../app/api/wakatime/route.ts", import.meta.url),
    "utf8",
  );

  assert.match(route, /getCodexStats/);
  assert.match(route, /codexAi/);
});

test("AI 面板展示 Codex 会话、项目 Token 与成本估算且不展示模型卡片", async () => {
  const panel = await readFile(
    new URL("../components/wakatime-stats.tsx", import.meta.url),
    "utf8",
  );

  assert.match(panel, /estimatedCostUsd/);
  assert.match(panel, /sessions/);
  assert.match(panel, /item\.tokens/);
  assert.match(panel, /awaitingCodexSync/);
  assert.doesNotMatch(panel, /aiModels/);
  assert.doesNotMatch(panel, /modelBreakdown/);
});

test("本机同步器只发送摘要并使用本地文件状态缓存", async () => {
  const script = await readFile(
    new URL("../scripts/sync-codex-ai.mjs", import.meta.url),
    "utf8",
  );

  assert.match(script, /summarizeCodexJsonlFile/);
  assert.match(script, /mtimeMs/);
  assert.match(script, /ai-sync-state\.json/);
  assert.doesNotMatch(script, /user_message.*message/);
});

test("Codex 大日志通过流式接口解析而不是整文件读入内存", async () => {
  const { summarizeCodexJsonlFile } = await import("../lib/codex-session-summary.mjs");
  const dir = await mkdtemp(path.join(os.tmpdir(), "huoyu-ai-sync-"));
  const file = path.join(dir, "session.jsonl");
  await writeFile(file, [
    JSON.stringify({ timestamp: "2026-07-16T10:00:00Z", type: "session_meta", payload: { id: "stream-1", cwd: "F:\\code\\HuoYu" } }),
    JSON.stringify({ timestamp: "2026-07-16T10:01:00Z", type: "event_msg", payload: { type: "token_count", info: { total_token_usage: { input_tokens: 12, output_tokens: 3 } } } }),
  ].join("\n"));

  try {
    const summary = await summarizeCodexJsonlFile(file);
    assert.equal(summary.id, "stream-1");
    assert.equal(summary.daily[0].inputTokens, 12);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("Windows 安装器创建隐藏且仅空闲时运行的计划任务", async () => {
  const installer = await readFile(
    new URL("../scripts/install-codex-ai-sync.ps1", import.meta.url),
    "utf8",
  );

  assert.match(installer, /wscript\.exe/);
  assert.match(installer, /RunOnlyIfIdle/);
  assert.match(installer, /HuoYu Codex AI Sync/);
  assert.match(installer, /\.env\.local/);
  assert.match(installer, /AI_SYNC_SECRET.*CRON_SECRET/s);
});

test("AI 汇总按时间范围合并项目、模型、会话和 Token", async () => {
  const { aggregateCodexSessions } =
    await import("../lib/codex-session-summary.mjs");
  const sessions = [
    {
      id: "session-1",
      project: "HuoYu",
      model: "gpt-test",
      source: "Codex Desktop",
      prompts: 2,
      daily: [
        {
          date: "2026-07-15",
          inputTokens: 100,
          cachedInputTokens: 40,
          outputTokens: 20,
          reasoningOutputTokens: 5,
          prompts: 1,
        },
        {
          date: "2026-07-16",
          inputTokens: 60,
          cachedInputTokens: 30,
          outputTokens: 15,
          reasoningOutputTokens: 3,
          prompts: 1,
        },
      ],
    },
  ];

  const result = aggregateCodexSessions(sessions, "2026-07-16", "2026-07-16");

  assert.equal(result.inputTokens, 60);
  assert.equal(result.outputTokens, 15);
  assert.equal(result.promptEvents, 1);
  assert.equal(result.sessions, 1);
  assert.deepEqual(result.projectBreakdown, [{ name: "HuoYu", tokens: 75 }]);
  assert.deepEqual(result.modelBreakdown, [{ name: "gpt-test", tokens: 75 }]);
});
