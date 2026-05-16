import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const enPath = path.join(root, "lib", "locales", "en.json");
const searchRoots = ["app", "components", "lib"].map((dir) => path.join(root, dir));

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

function collectFiles(dir, result = []) {
  if (!fs.existsSync(dir)) return result;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectFiles(fullPath, result);
    } else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
      result.push(fullPath);
    }
  }

  return result;
}

function looksEnglish(text) {
  const letters = text.match(/[A-Za-z]/g)?.length || 0;
  const cjk = text.match(/[\u3400-\u9fff]/g)?.length || 0;
  return letters > 0 && cjk === 0;
}

function extractDefaults(source) {
  const defaults = new Map();
  const callPattern =
    /\bt\s*\(\s*(['"])([\w.-]+)\1\s*,\s*(['"])((?:\\.|(?!\3)[\s\S])*?)\3/g;

  for (const match of source.matchAll(callPattern)) {
    const key = match[2];
    const raw = match[4];
    const value = raw
      .replace(/\\n/g, "\n")
      .replace(/\\r/g, "\r")
      .replace(/\\t/g, "\t")
      .replace(/\\"/g, '"')
      .replace(/\\'/g, "'");

    if (looksEnglish(value) && !defaults.has(key)) {
      defaults.set(key, value);
    }
  }

  return defaults;
}

const en = readJson(enPath);
const defaults = new Map();

for (const file of searchRoots.flatMap((dir) => collectFiles(dir))) {
  const source = fs.readFileSync(file, "utf8");
  for (const [key, value] of extractDefaults(source)) {
    if (!defaults.has(key)) defaults.set(key, value);
  }
}

let filled = 0;
for (const [key, value] of defaults) {
  const current = getByPath(en, key);
  if (typeof current !== "string" || !current.trim()) {
    setByPath(en, key, value);
    filled += 1;
  }
}

writeJson(enPath, en);
console.log(`Filled ${filled} English translations from source defaults.`);
