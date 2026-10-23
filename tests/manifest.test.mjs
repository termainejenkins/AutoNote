import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(relativePath) {
  return readFileSync(join(root, relativePath));
}

function readText(relativePath) {
  return read(relativePath).toString("utf8");
}

function pngSize(buffer) {
  assert.equal(buffer.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  assert.equal(buffer.subarray(12, 16).toString("ascii"), "IHDR");
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

test("manifest is Manifest V3 JSON with the skeleton contract", () => {
  const raw = readText("extension/manifest.json");
  const manifest = JSON.parse(raw);

  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.name, "AutoNote");
  assert.match(manifest.version, /^\d+(\.\d+){0,3}$/);
  assert.equal(typeof manifest.description, "string");
  assert.equal(manifest.description.toLowerCase().includes("coursera"), false);

  assert.deepEqual(manifest.permissions, [
    "storage",
    "scripting",
    "activeTab",
    "tabs",
  ]);
  assert.equal(Object.hasOwn(manifest, "host_permissions"), false);
  assert.deepEqual(manifest.content_scripts, [
    {
      matches: ["http://*/*", "https://*/*"],
      js: ["snapshot.js", "content.js"],
      run_at: "document_idle",
    },
  ]);

  const optional = manifest.optional_host_permissions;
  assert.ok(Array.isArray(optional));
  assert.equal(optional.some((pattern) => /coursera|localhost/i.test(pattern)), false);
  assert.ok(optional.includes("https://generativelanguage.googleapis.com/*"));

  assert.equal(manifest.background.service_worker, "background.js");
  assert.equal(manifest.background.type, "module");
  assert.equal(manifest.action.default_popup, "popup.html");
  assert.equal(manifest.options_ui.page, "options.html");
  assert.equal(manifest.options_ui.open_in_tab, true);

  for (const relativePath of [
    manifest.background.service_worker,
    manifest.action.default_popup,
    manifest.options_ui.page,
    "popup.js",
    "options.js",
    "gemini.js",
    "notes.html",
    "notes.js",
    "content.js",
    "snapshot.js",
  ]) {
    assert.equal(readText(join("extension", relativePath)).length > 0, true);
  }

  for (const size of [16, 32, 48, 128]) {
    const relativePath = `icons/icon${size}.png`;
    assert.equal(manifest.icons[String(size)], relativePath);
    assert.equal(manifest.action.default_icon[String(size)], relativePath);
    const actual = pngSize(read(join("extension", relativePath)));
    assert.deepEqual(actual, { width: size, height: size });
  }

  assert.equal(/coursera|localhost/i.test(raw), false);
});

test("service worker logs that it started and does not call the network", () => {
  const source = readText("extension/background.js");
  assert.match(source, /AutoNote service worker started/);
  assert.equal(source.includes("fetch("), false);
  assert.equal(/coursera|localhost/i.test(source), false);
});
