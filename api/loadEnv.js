import fs from "node:fs";
import path from "node:path";

const initialEnvKeys = new Set(Object.keys(process.env));
const loadedKeys = new Set();

function parseEnvFile(content) {
  const entries = [];
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const normalized = trimmed.startsWith("export ") ? trimmed.slice(7).trim() : trimmed;
    const equalsIndex = normalized.indexOf("=");
    if (equalsIndex === -1) {
      continue;
    }

    const key = normalized.slice(0, equalsIndex).trim();
    let value = normalized.slice(equalsIndex + 1).trim();

    if (!key) {
      continue;
    }

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    } else {
      const commentIndex = value.indexOf(" #");
      if (commentIndex !== -1) {
        value = value.slice(0, commentIndex).trimEnd();
      }
    }

    entries.push([key, value]);
  }

  return entries;
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, "utf8");
  for (const [key, value] of parseEnvFile(content)) {
    if (initialEnvKeys.has(key) && !loadedKeys.has(key)) {
      continue;
    }

    process.env[key] = value;
    loadedKeys.add(key);
  }
}

loadEnvFile(path.resolve(process.cwd(), ".env"));
loadEnvFile(path.resolve(process.cwd(), ".env.local"));
