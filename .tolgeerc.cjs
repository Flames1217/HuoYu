const fs = require("node:fs");
const path = require("node:path");

const envPath = path.join(__dirname, ".env.local");

if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
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

const apiUrl = String(process.env.TOLGEE_API_URL || "https://app.tolgee.io").trim().replace(/\/+$/, "");
const rawProjectId = String(process.env.TOLGEE_PROJECT_ID || "18255").trim();
const projectId = rawProjectId ? Number.parseInt(rawProjectId, 10) : undefined;
const apiKey = String(process.env.TOLGEE_API_KEY || process.env.TOLGEE_PAT || "").trim();

module.exports = {
  apiUrl,
  projectId,
  apiKey,
  patterns: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  parser: "react",
  strictNamespace: false,
  push: {
    files: [
      {
        path: "./lib/locales/cn.json",
        language: "zh-Hans"
      },
      {
        path: "./lib/locales/en.json",
        language: "en"
      },
      {
        path: "./lib/locales/es.json",
        language: "es"
      },
      {
        path: "./lib/locales/fr.json",
        language: "fr"
      },
      {
        path: "./lib/locales/ja.json",
        language: "ja"
      }
    ],
    forceMode: "OVERRIDE"
  },
  pull: {
    path: "./lib/locales",
    languages: ["zh-Hans", "en", "es", "fr", "ja"],
    fileStructureTemplate: "{languageTag}.json",
    delimiter: "."
  },
  sync: {
    continueOnWarning: true
  }
};
