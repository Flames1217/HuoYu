import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const cnPath = path.join(root, "lib", "locales", "cn.json");
const enPath = path.join(root, "lib", "locales", "en.json");
const envPath = path.join(root, ".env.local");

const apiUrl = (
  process.env.MTRAN_API_URL ||
  process.env.TRANSLATE_API_URL ||
  process.env.TRAN_API_URL ||
  "https://tran.viper3.top"
).replace(/\/+$/, "");

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

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function getByPath(source, keyPath) {
  return keyPath.split(".").reduce((current, segment) => {
    if (isPlainObject(current) && segment in current) return current[segment];
    return undefined;
  }, source);
}

function setByPath(target, keyPath, value) {
  const parts = keyPath.split(".");
  let current = target;
  for (const part of parts.slice(0, -1)) {
    if (!isPlainObject(current[part])) current[part] = {};
    current = current[part];
  }
  current[parts.at(-1)] = value;
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

function protectPlaceholders(text) {
  const placeholders = [];
  const protectedText = text.replace(/\{\{\s*[\w.-]+\s*\}\}/g, (placeholder) => {
    const token = `__TLG_PLACEHOLDER_${placeholders.length}__`;
    placeholders.push({ token, placeholder });
    return token;
  });

  return { protectedText, placeholders };
}

function restorePlaceholders(text, placeholders) {
  let restored = text;
  for (const { token, placeholder } of placeholders) {
    restored = restored.replaceAll(token, placeholder);
    restored = restored.replaceAll(token.replace("PLACEHOLDER", "PLACEHALDER"), placeholder);
  }
  return restored;
}

function normalizeToken(value) {
  let token = String(value || "").trim();
  if (
    (token.startsWith('"') && token.endsWith('"')) ||
    (token.startsWith("'") && token.endsWith("'"))
  ) {
    token = token.slice(1, -1).trim();
  }
  return token;
}

function placeholdersOf(text) {
  return [...text.matchAll(/\{\{\s*([\w.-]+)\s*\}\}/g)].map((match) => match[1]).sort();
}

function samePlaceholders(a, b) {
  const left = placeholdersOf(a);
  const right = placeholdersOf(b);
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function parseTranslations(response, expectedLength) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.translations)) {
    return response.translations.map((item) =>
      typeof item === "string" ? item : item?.text || item?.translatedText || item?.data || ""
    );
  }
  if (Array.isArray(response?.texts)) return response.texts;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.result)) return response.result;
  if (Array.isArray(response?.results)) return response.results;
  if (typeof response?.text === "string" && expectedLength === 1) return [response.text];
  throw new Error(`Unsupported translation response: ${JSON.stringify(response).slice(0, 500)}`);
}

async function translateBatch(items, token) {
  const body = {
    from: process.env.MTRAN_FROM || "auto",
    to: process.env.MTRAN_TO || "en",
    texts: items.map((item) => item.protectedText),
    html: false,
  };

  const response = await fetch(`${apiUrl}/translate/batch`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: token,
    },
    body: JSON.stringify(body),
  });

  const raw = await response.text();
  let data;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = raw;
  }

  if (!response.ok) {
    throw new Error(`Translation API failed (${response.status}): ${raw}`);
  }

  return parseTranslations(data, items.length);
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function translateWithRetry(items, token) {
  const maxAttempts = Number.parseInt(process.env.MTRAN_RETRIES || "3", 10);
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await translateBatch(items, token);
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts) {
        await wait(attempt * 1500);
      }
    }
  }

  if (items.length > 1) {
    console.warn(`Batch of ${items.length} failed; retrying item by item.`);
    const result = [];
    for (const item of items) {
      const [translated] = await translateWithRetry([item], token);
      result.push(translated);
      await wait(300);
    }
    return result;
  }

  throw lastError;
}

async function main() {
  loadDotenv(envPath);

  const token =
    process.env.MTRAN_API_KEY ||
    process.env.MTRAN_AUTHORIZATION ||
    process.env.TRANSLATE_API_KEY ||
    process.env.TRAN_API_KEY;
  const normalizedToken = normalizeToken(token);

  if (!normalizedToken) {
    throw new Error(
      "Missing translation API token. Add MTRAN_API_KEY=... to .env.local, then rerun pnpm translate:fill-en."
    );
  }

  const cn = readJson(cnPath);
  const en = readJson(enPath);
  const cnStrings = flattenStrings(cn);

  const missing = Object.entries(cnStrings)
    .filter(([key, value]) => typeof value === "string" && value.trim())
    .filter(([key]) => typeof getByPath(en, key) !== "string" || !String(getByPath(en, key)).trim())
    .map(([key, source]) => {
      const { protectedText, placeholders } = protectPlaceholders(source);
      return { key, source, protectedText, placeholders };
    });

  if (missing.length === 0) {
    console.log("No missing English translations found.");
    return;
  }

  const batchSize = Number.parseInt(process.env.MTRAN_BATCH_SIZE || "20", 10);
  const issues = [];

  console.log(`Missing English translations: ${missing.length}`);
  console.log(`Using ${apiUrl}/translate/batch in batches of ${batchSize}`);

  for (let offset = 0; offset < missing.length; offset += batchSize) {
    const batch = missing.slice(offset, offset + batchSize);
    const translations = await translateWithRetry(batch, normalizedToken);

    if (translations.length !== batch.length) {
      throw new Error(`Expected ${batch.length} translations, got ${translations.length}`);
    }

    translations.forEach((translation, index) => {
      const item = batch[index];
      const restored = restorePlaceholders(String(translation || "").trim(), item.placeholders);
      setByPath(en, item.key, restored);

      if (!samePlaceholders(item.source, restored)) {
        issues.push({
          key: item.key,
          source: item.source,
          translated: restored,
        });
      }
    });

    console.log(`Translated ${Math.min(offset + batch.length, missing.length)}/${missing.length}`);
  }

  writeJson(enPath, en);

  if (issues.length > 0) {
    console.warn(`Placeholder issues: ${issues.length}`);
    for (const issue of issues.slice(0, 20)) {
      console.warn(`- ${issue.key}`);
      console.warn(`  source: ${issue.source}`);
      console.warn(`  en: ${issue.translated}`);
    }
    if (issues.length > 20) console.warn(`...and ${issues.length - 20} more`);
    process.exitCode = 2;
  } else {
    console.log("Done. Placeholder check passed.");
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
