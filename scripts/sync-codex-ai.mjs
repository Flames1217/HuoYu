import { readdir, readFile, stat, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { summarizeCodexJsonl } from "../lib/codex-session-summary.mjs";

const dataDir = path.join(process.env.LOCALAPPDATA || os.homedir(), "HuoYu");
const configPath = path.join(dataDir, "ai-sync.json");
const statePath = path.join(dataDir, "ai-sync-state.json");

async function jsonFile(file, fallback) {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch {
    return fallback;
  }
}

async function jsonlFiles(root) {
  const result = [];
  async function walk(dir) {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(file);
      else if (entry.name.endsWith(".jsonl")) result.push(file);
    }
  }
  await walk(root);
  return result;
}

async function main() {
  const config = await jsonFile(configPath, {});
  const endpoint = process.env.AI_SYNC_ENDPOINT || config.endpoint;
  const secret = process.env.AI_SYNC_SECRET || config.secret;
  const codexHome =
    process.env.CODEX_HOME ||
    config.codexHome ||
    path.join(os.homedir(), ".codex");
  if (!endpoint || !secret) throw new Error(`请先配置 ${configPath}`);

  const state = await jsonFile(statePath, { files: {} });
  const files = [
    ...(await jsonlFiles(path.join(codexHome, "sessions"))),
    ...(await jsonlFiles(path.join(codexHome, "archived_sessions"))),
  ];
  const nextFiles = {};
  const sessions = new Map();

  for (const file of files) {
    const info = await stat(file);
    const cached = state.files[file];
    const summary =
      cached?.mtimeMs === info.mtimeMs && cached?.size === info.size
        ? cached.summary
        : summarizeCodexJsonl(await readFile(file, "utf8"));
    nextFiles[file] = { mtimeMs: info.mtimeMs, size: info.size, summary };
    if (
      summary?.id &&
      (!sessions.has(summary.id) ||
        summary.updatedAt > sessions.get(summary.id).updatedAt)
    )
      sessions.set(summary.id, summary);
  }

  const rows = [...sessions.values()];
  for (let index = 0; index < rows.length; index += 200) {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({ sessions: rows.slice(index, index + 200) }),
    });
    if (!response.ok) throw new Error(`AI 同步失败：HTTP ${response.status}`);
  }

  await mkdir(dataDir, { recursive: true });
  await writeFile(statePath, JSON.stringify({ files: nextFiles }), "utf8");
  console.log(`AI 同步完成：${rows.length} 个会话摘要`);
}

await main();
