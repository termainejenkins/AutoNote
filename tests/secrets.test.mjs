import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const selfPath = fileURLToPath(import.meta.url);

const forbidden = [
  /SECRET_KEY/,
  /JWT_SECRET/,
  /POSTGRES_PASSWORD/,
  /admin\/admin/,
  /your-secret-key/,
  /your-api-key/,
  /AIza[0-9A-Za-z\-_]{10,}/,
  /sk-[A-Za-z0-9]{20,}/,
  /BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY/,
  /testpass123/,
  /fakehashedsecret/,
  /postgresql:\/\/[^:\s]+:[^@\s]+@/,
  /"password"\s*:\s*"/,
];

function walk(directory, found = []) {
  for (const name of readdirSync(directory)) {
    if (name === ".git" || name === "node_modules") {
      continue;
    }
    const path = join(directory, name);
    const info = statSync(path);
    if (info.isDirectory()) {
      walk(path, found);
    } else {
      found.push(path);
    }
  }
  return found;
}

test("tree has no API keys, passwords, or secret defaults", () => {
  const hits = [];
  for (const path of walk(root)) {
    if (path === selfPath || path.endsWith(".png")) {
      continue;
    }
    const text = readFileSync(path).toString("utf8");
    if (text.includes("\0")) {
      continue;
    }
    for (const pattern of forbidden) {
      if (pattern.test(text)) {
        hits.push(`${relative(root, path)} matched ${pattern}`);
      }
    }
  }
  assert.deepEqual(hits, []);
});

test("gitignore ignores a local virtualenv and env files", () => {
  const text = readFileSync(join(root, ".gitignore"), "utf8");
  assert.match(text, /(^|\n)\.venv\/(\n|$)/);
  assert.match(text, /(^|\n)\.env(\n|$)/);
  assert.equal(statSafe(join(root, ".venv")), false);
});

function statSafe(path) {
  try {
    return statSync(path).isDirectory();
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return false;
    }
    throw error;
  }
}
