import path from "node:path";

const number = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);
const dateOf = (timestamp) => String(timestamp || "").slice(0, 10);

export function summarizeCodexJsonl(text) {
  let id = "";
  let cwd = "";
  let source = "Codex";
  let model = "Unknown";
  let startedAt = "";
  let updatedAt = "";
  let previous = {
    inputTokens: 0,
    cachedInputTokens: 0,
    outputTokens: 0,
    reasoningOutputTokens: 0,
  };
  const daily = new Map();

  for (const line of String(text).split(/\r?\n/)) {
    if (!line.trim()) continue;
    let event;
    try {
      event = JSON.parse(line);
    } catch {
      continue;
    }

    const timestamp = String(event.timestamp || event.payload?.timestamp || "");
    if (timestamp) {
      startedAt ||= timestamp;
      updatedAt = timestamp;
    }
    if (event.type === "session_meta") {
      id = String(event.payload?.id || event.payload?.session_id || id);
      cwd = String(event.payload?.cwd || cwd);
      source = String(event.payload?.originator || source);
    }
    if (event.type === "turn_context") {
      cwd = String(event.payload?.cwd || cwd);
      model = String(event.payload?.model || model);
    }

    const day = dateOf(timestamp);
    if (!day) continue;
    const bucket = daily.get(day) || {
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
        for (const key of Object.keys(previous))
          bucket[key] += Math.max(0, current[key] - previous[key]);
        previous = current;
      }
    }
    daily.set(day, bucket);
  }

  const rows = [...daily.values()].filter(
    (row) => row.prompts || row.inputTokens || row.outputTokens,
  );
  return {
    id,
    project: cwd ? path.basename(cwd) : "Unknown",
    model,
    source,
    startedAt,
    updatedAt,
    prompts: rows.reduce((sum, row) => sum + row.prompts, 0),
    daily: rows,
  };
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
