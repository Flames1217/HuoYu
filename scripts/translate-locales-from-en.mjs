import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const localeDir = path.join(root, "lib", "locales");
const envPath = path.join(root, ".env.local");
const sourcePath = path.join(localeDir, "en.json");

const targets = [
  { locale: "es", apiCode: "es" },
  { locale: "fr", apiCode: "fr" },
  { locale: "ja", apiCode: "ja" },
].filter((target) => {
  const requested = (process.env.TARGET_LOCALES || "")
    .split(",")
    .map((locale) => locale.trim())
    .filter(Boolean);
  return requested.length === 0 || requested.includes(target.locale);
});

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

function setByPath(target, keyPath, value) {
  const parts = keyPath.split(".");
  let current = target;
  for (const part of parts.slice(0, -1)) {
    if (!isPlainObject(current[part])) current[part] = {};
    current = current[part];
  }
  current[parts.at(-1)] = value;
}

function getByPath(source, keyPath) {
  return keyPath.split(".").reduce((current, segment) => {
    if (isPlainObject(current) && segment in current) return current[segment];
    return undefined;
  }, source);
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

function shouldKeepSource(key, value) {
  const text = String(value);
  if (!text.trim()) return true;
  if (/^https?:\/\//i.test(text)) return true;
  if (/^[a-z0-9]+(?:,[a-z0-9]+)+$/i.test(text)) return true;
  if (key.endsWith("Url") || key.endsWith("URL")) return true;
  return false;
}

function protectPlaceholders(text) {
  const placeholders = [];
  const protectedText = text.replace(/\{\{\s*[\w.-]+\s*\}\}/g, (placeholder) => {
    const token = `XHUOYUPH${placeholders.length}X`;
    placeholders.push({ token, placeholder });
    return token;
  });

  return { protectedText, placeholders };
}

function restorePlaceholders(text, placeholders) {
  let restored = text;
  for (const { token, placeholder } of placeholders) {
    const looseToken = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").split("").join("\\s*");
    const index = token.match(/\d+/)?.[0] || "";
    restored = restored.replace(new RegExp(looseToken, "gi"), placeholder);
    restored = restored.replaceAll(token, placeholder);
    if (index) {
      restored = restored.replace(new RegExp(`X\\s*H\\s*U\\s*O\\s*Y\\s*U?\\s*P\\s*H\\s*P?\\s*${index}\\s*X`, "gi"), placeholder);
      restored = restored.replace(new RegExp(`X\\s*H\\s*U\\s*O\\s*Y\\s*U?\\s*P\\s*H\\s*${index}`, "gi"), placeholder);
      if (placeholders.length === 1) {
        restored = restored.replace(new RegExp("X\\s*H\\s*U\\s*O\\s*Y\\s*U?\\s*P\\s*H\\s*P?\\s*X", "gi"), placeholder);
      }
    }
  }
  return restored;
}

function placeholdersOf(text) {
  return [...String(text).matchAll(/\{\{\s*([\w.-]+)\s*\}\}/g)].map((match) => match[1]).sort();
}

function samePlaceholders(a, b) {
  const left = placeholdersOf(a);
  const right = placeholdersOf(b);
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function parseTranslations(response, expectedLength) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.results)) return response.results;
  if (Array.isArray(response?.translations)) {
    return response.translations.map((item) =>
      typeof item === "string" ? item : item?.text || item?.translatedText || item?.data || ""
    );
  }
  if (Array.isArray(response?.texts)) return response.texts;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.result)) return response.result;
  if (typeof response?.text === "string" && expectedLength === 1) return [response.text];
  throw new Error(`Unsupported translation response: ${JSON.stringify(response).slice(0, 500)}`);
}

async function translateBatch(items, token, target) {
  const response = await fetch(`${apiUrl}/translate/batch`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: token,
    },
    body: JSON.stringify({
      from: "en",
      to: target,
      texts: items.map((item) => item.protectedText),
      html: false,
    }),
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

async function translateWithRetry(items, token, target) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await translateBatch(items, token, target);
    } catch (error) {
      lastError = error;
      if (attempt < 3) await wait(attempt * 1500);
    }
  }

  if (items.length > 1) {
    const result = [];
    for (const item of items) {
      const [translated] = await translateWithRetry([item], token, target);
      result.push(translated);
      await wait(300);
    }
    return result;
  }

  throw lastError;
}

async function main() {
  loadDotenv(envPath);

  const token = normalizeToken(
    process.env.MTRAN_API_KEY ||
      process.env.MTRAN_AUTHORIZATION ||
      process.env.TRANSLATE_API_KEY ||
      process.env.TRAN_API_KEY
  );

  if (!token) {
    throw new Error("Missing translation API token. Add MTRAN_API_KEY to .env.local.");
  }

  const source = readJson(sourcePath);
  const sourceStrings = flattenStrings(source);
  const entries = Object.entries(sourceStrings);
  const batchSize = Number.parseInt(process.env.MTRAN_BATCH_SIZE || "50", 10);

  for (const { locale, apiCode } of targets) {
    const targetPath = path.join(localeDir, `${locale}.json`);
    const targetData = readJson(targetPath);
    const translatedCache = new Map();
    const issues = [];
    const translatable = entries
      .filter(([key, value]) => !shouldKeepSource(key, value))
      .filter(([key, value]) => {
        const current = getByPath(targetData, key);
        return (
          typeof current !== "string" ||
          !current.trim() ||
          current === value ||
          !samePlaceholders(value, current)
        );
      })
      .map(([key, sourceText]) => {
        const { protectedText, placeholders } = protectPlaceholders(sourceText);
        return { key, sourceText, protectedText, placeholders };
      });

    console.log(`Translating ${locale}: ${translatable.length} strings`);

    for (let offset = 0; offset < translatable.length; offset += batchSize) {
      const batch = translatable.slice(offset, offset + batchSize);
      const uncachedItems = batch.filter((item) => !translatedCache.has(item.sourceText));

      if (uncachedItems.length > 0) {
        const translations = await translateWithRetry(uncachedItems, token, apiCode);
        if (translations.length !== uncachedItems.length) {
          throw new Error(`Expected ${uncachedItems.length} translations, got ${translations.length}`);
        }

        translations.forEach((translation, index) => {
          const item = uncachedItems[index];
          const restored = restorePlaceholders(String(translation || "").trim(), item.placeholders);
          translatedCache.set(item.sourceText, restored);
        });
      }

      for (const item of batch) {
        const restored = translatedCache.get(item.sourceText);
        setByPath(targetData, item.key, restored);
        if (!samePlaceholders(item.sourceText, restored)) {
          issues.push({ key: item.key, source: item.sourceText, translated: restored });
        }
      }

      console.log(`${locale}: ${Math.min(offset + batch.length, translatable.length)}/${translatable.length}`);
    }

    for (const [key, value] of entries) {
      if (shouldKeepSource(key, value)) setByPath(targetData, key, value);
    }

    writeJson(targetPath, targetData);

    if (issues.length > 0) {
      console.warn(`${locale}: placeholder issues ${issues.length}`);
      for (const issue of issues.slice(0, 10)) {
        console.warn(`- ${issue.key}: ${issue.source} -> ${issue.translated}`);
      }
      process.exitCode = 2;
    } else {
      console.log(`${locale}: done`);
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
