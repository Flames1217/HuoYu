import path from "node:path";
import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";

const number = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);
const dateOf = (timestamp) => String(timestamp || "").slice(0, 10);

function summaryState() {
  return {
    id: "",
    cwd: "",
    source: "Codex",
    model: "Unknown",
    startedAt: "",
    updatedAt: "",
    daily: new Map(),
    previous: {
      inputTokens: 0,
      cachedInputTokens: 0,
      outputTokens: 0,
      reasoningOutputTokens: 0,
    },
  };
}

function consumeLine(state, line) {
  if (!line.trim() || !/"(?:session_meta|turn_context|token_count|user_message)"/.test(line)) return;
  let event;
  try {
    event = JSON.parse(line);
  } catch {
    return;
  }

  const timestamp = String(event.timestamp || event.payload?.timestamp || "");
  if (timestamp) {
    state.startedAt ||= timestamp;
    state.updatedAt = timestamp;
  }
  if (event.type === "session_meta") {
    state.id = String(event.payload?.id || event.payload?.session_id || state.id);
    state.cwd = String(event.payload?.cwd || state.cwd);
    state.source = String(event.payload?.originator || state.source);
  }
  if (event.type === "turn_context") {
    state.cwd = String(event.payload?.cwd || state.cwd);
    state.model = String(event.payload?.model || state.model);
  }

  const day = dateOf(timestamp);
  if (!day) return;
  const bucket = state.daily.get(day) || {
    date: day,
    inputTokens: 0,
    cachedInputTokens: 0,
    outputTokens: 0,
    reasoningOutputTokens: 0,
    prompts: 0,
  };
  if (event.type === "event_msg" && event.payload?.type === "user_message")
    bucket.prompts += 1;
  if (event.type === "event_msg" && event.payload?.type === "token_count") {
    const usage = event.payload?.info?.total_token_usage;
    if (usage) {
      const current = {
        inputTokens: number(usage.input_tokens),
        cachedInputTokens: number(usage.cached_input_tokens),
        outputTokens: number(usage.output_tokens),
        reasoningOutputTokens: number(usage.reasoning_output_tokens),
      };
      for (const key of Object.keys(state.previous))
        bucket[key] += Math.max(0, current[key] - state.previous[key]);
      state.previous = current;
    }
  }
  state.daily.set(day, bucket);
}

function finishSummary(state) {
  const rows = [...state.daily.values()].filter(
    (row) => row.prompts || row.inputTokens || row.outputTokens,
  );
  return {
    id: state.id,
    project: state.cwd ? path.basename(state.cwd) : "Unknown",
    model: state.model,
    source: state.source,
    startedAt: state.startedAt,
    updatedAt: state.updatedAt,
    prompts: rows.reduce((sum, row) => sum + row.prompts, 0),
    daily: rows,
  };
}

export function summarizeCodexJsonl(text) {
  const state = summaryState();
  for (const line of String(text).split(/\r?\n/)) consumeLine(state, line);
  return finishSummary(state);
}

export async function summarizeCodexJsonlFile(file) {
  const state = summaryState();
  const lines = createInterface({
    input: createReadStream(file, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });
  for await (const line of lines) consumeLine(state, line);
  return finishSummary(state);
}

function ranked(map) {
  return [...map.entries()]
    .map(([name, tokens]) => ({ name, tokens }))
    .sort((a, b) => b.tokens - a.tokens);
}

export function aggregateCodexSessions(sessions, start, end) {
  const totals = {
    inputTokens: 0,
    cachedInputTokens: 0,
    outputTokens: 0,
    reasoningOutputTokens: 0,
    promptEvents: 0,
  };
  const projects = new Map();
  const models = new Map();
  const sources = new Map();
  const activeSessions = new Set();

  for (const session of sessions || []) {
    for (const row of session?.daily || []) {
      if (row.date < start || row.date > end) continue;
      const tokens = number(row.inputTokens) + number(row.outputTokens);
      totals.inputTokens += number(row.inputTokens);
      totals.cachedInputTokens += number(row.cachedInputTokens);
      totals.outputTokens += number(row.outputTokens);
      totals.reasoningOutputTokens += number(row.reasoningOutputTokens);
      totals.promptEvents += number(row.prompts);
      activeSessions.add(session.id);
      projects.set(
        session.project || "Unknown",
        number(projects.get(session.project || "Unknown")) + tokens,
      );
      models.set(
        session.model || "Unknown",
        number(models.get(session.model || "Unknown")) + tokens,
      );
      sources.set(
        session.source || "Codex",
        number(sources.get(session.source || "Codex")) + tokens,
      );
    }
  }

  return {
    ...totals,
    sessions: activeSessions.size,
    projectBreakdown: ranked(projects).slice(0, 5),
    modelBreakdown: ranked(models).slice(0, 5),
    sourceBreakdown: ranked(sources).slice(0, 5),
  };
}
