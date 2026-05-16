import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const envPath = path.join(root, ".env.local");
const localeDir = path.join(root, "lib", "locales");
const languageFiles = {
  "zh-Hans": "cn",
  en: "en",
  es: "es",
  fr: "fr",
  ja: "ja",
};

function loadDotenv(filePath) {
  if (!fs.existsSync(filePath)) return;

  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) continue;

    const [, key, rawValue] = match;
    if (process.env[key] !== undefined) continue;

    let value = rawValue.trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function flattenStrings(source, prefix = "", result = {}) {
  for (const [key, value] of Object.entries(source)) {
    const nextKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") {
      result[nextKey] = value;
    } else if (isPlainObject(value)) {
      flattenStrings(value, nextKey, result);
    }
  }
  return result;
}

function addExistingTranslations(source, language, prefix = "", result = new Map()) {
  for (const [key, value] of Object.entries(source || {})) {
    const nextKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") {
      if (!result.has(nextKey)) result.set(nextKey, new Set());
      result.get(nextKey).add(language);
    } else if (isPlainObject(value)) {
      addExistingTranslations(value, language, nextKey, result);
    }
  }

  return result;
}

function chunk(items, size) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

async function putTranslation({ baseUrl, projectId, apiKey, key, translations }) {
  const response = await fetch(`${baseUrl}/v2/projects/${projectId}/translations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
    },
    body: JSON.stringify({ key, translations }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${key}: ${response.status} ${text}`);
  }
}

async function fetchExistingKeys({ baseUrl, projectId, apiKey }) {
  const keys = new Set();
  const pageSize = 500;
  let page = 0;
  let totalPages = 1;

  while (page < totalPages) {
    const response = await fetch(`${baseUrl}/v2/projects/${projectId}/keys?page=${page}&size=${pageSize}`, {
      headers: {
        "X-API-Key": apiKey,
      },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to fetch Tolgee keys: ${response.status} ${text}`);
    }

    const data = await response.json();
    for (const item of data?._embedded?.keys || []) {
      if (typeof item.name === "string") keys.add(item.name);
    }

    totalPages = Number(data?.page?.totalPages || 1);
    page += 1;
  }

  return keys;
}

async function fetchExistingTranslationMap({ baseUrl, projectId, apiKey, languages }) {
  const response = await fetch(`${baseUrl}/v2/projects/${projectId}/translations/${languages.join(",")}`, {
    headers: {
      "X-API-Key": apiKey,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to fetch Tolgee translations: ${response.status} ${text}`);
  }

  const data = await response.json();
  const result = new Map();
  for (const language of languages) {
    addExistingTranslations(data?.[language] || {}, language, "", result);
  }

  return result;
}

async function main() {
  loadDotenv(envPath);

  const apiKey = process.env.TOLGEE_API_KEY || process.env.TOLGEE_PAT;
  const projectId = process.env.TOLGEE_PROJECT_ID || "18255";
  const baseUrl = (process.env.TOLGEE_API_URL || "https://app.tolgee.io").replace(/\/+$/, "");

  if (!apiKey) {
    throw new Error("Missing TOLGEE_API_KEY in .env.local");
  }

  const flattenedByLanguage = Object.fromEntries(
    Object.entries(languageFiles).map(([tag, file]) => [
      tag,
      flattenStrings(JSON.parse(fs.readFileSync(path.join(localeDir, `${file}.json`), "utf8"))),
    ])
  );

  const sourceKeys = Object.keys(flattenedByLanguage["zh-Hans"]);
  const skipNewKeys = process.env.TOLGEE_SKIP_NEW_KEYS !== "false";
  const syncExistingTranslationsOnly = process.env.TOLGEE_SYNC_EXISTING_TRANSLATIONS_ONLY === "true";
  const languageTags = Object.keys(languageFiles);
  const existingKeys = skipNewKeys ? await fetchExistingKeys({ baseUrl, projectId, apiKey }) : null;
  const existingTranslations = syncExistingTranslationsOnly
    ? await fetchExistingTranslationMap({ baseUrl, projectId, apiKey, languages: languageTags })
    : null;
  const selectedKeys = existingKeys ? sourceKeys.filter((key) => existingKeys.has(key)) : sourceKeys;
  const skipped = sourceKeys.length - selectedKeys.length;
  const tasks = selectedKeys.map((key) => ({
    key,
    translations: Object.fromEntries(
      Object.entries(flattenedByLanguage)
        .map(([tag, values]) => [tag, values[key]])
        .filter(([tag, value]) => typeof value === "string" && (!existingTranslations || existingTranslations.get(key)?.has(tag)))
    ),
  })).filter((task) => Object.keys(task.translations).length > 0);

  if (skipped > 0) {
    console.log(`Skipping ${skipped} local keys that do not exist in Tolgee yet.`);
  }
  if (syncExistingTranslationsOnly) {
    console.log("Updating only translation records that already exist in Tolgee.");
  }

  let completed = 0;
  for (const batch of chunk(tasks, 8)) {
    await Promise.all(batch.map((task) => putTranslation({ baseUrl, projectId, apiKey, ...task })));
    completed += batch.length;
    console.log(`Synced ${completed}/${tasks.length}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
