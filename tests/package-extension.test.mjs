import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import {
  collectExtensionFiles,
  createExtensionZip,
  filesReferencedByManifest,
  isExcludedRelativePath,
  listZipEntries,
  packageNames,
  validateExtensionZip,
} from "../scripts/package-extension.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function withTempDir(run) {
  const dir = mkdtempSync(join(tmpdir(), "autonote-zip-"));
  try {
    return run(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function writeFixture(dir, files) {
  for (const [relativePath, contents] of Object.entries(files)) {
    const absolute = join(dir, relativePath);
    mkdirSync(dirname(absolute), { recursive: true });
    writeFileSync(absolute, contents);
  }
}

test("exclusion rules drop tests, dotfiles, and source maps", () => {
  assert.equal(isExcludedRelativePath(".env"), true);
  assert.equal(isExcludedRelativePath("src/.secret/key.txt"), true);
  assert.equal(isExcludedRelativePath("tests/hidden.js"), true);
  assert.equal(isExcludedRelativePath("nested/__tests__/case.js"), true);
  assert.equal(isExcludedRelativePath("widget.test.js"), true);
  assert.equal(isExcludedRelativePath("widget.spec.mjs"), true);
  assert.equal(isExcludedRelativePath("vendor/app.js.map"), true);
  assert.equal(isExcludedRelativePath("manifest.json"), false);
  assert.equal(isExcludedRelativePath("icons/icon16.png"), false);
  assert.equal(isExcludedRelativePath("snapshot.js"), false);
});

test("manifest walker collects icons, worker, popup, options, and content scripts", () => {
  const files = filesReferencedByManifest({
    icons: { "16": "icons/icon16.png" },
    action: {
      default_popup: "./popup.html",
      default_icon: "icons/action.png",
    },
    background: { service_worker: "background.js" },
    options_ui: { page: "options.html" },
    options_page: "legacy-options.html",
    content_scripts: [
      { js: ["content.js", "snapshot.js"], css: ["content.css"] },
    ],
  });

  assert.deepEqual(files, [
    "background.js",
    "content.css",
    "content.js",
    "icons/action.png",
    "icons/icon16.png",
    "legacy-options.html",
    "options.html",
    "popup.html",
    "snapshot.js",
  ]);
});

test("the real manifest's packaged paths are the loadable entry points", () => {
  const manifest = JSON.parse(readFileSync(join(root, "extension/manifest.json"), "utf8"));
  assert.deepEqual(filesReferencedByManifest(manifest), [
    "background.js",
    "content.js",
    "icons/icon128.png",
    "icons/icon16.png",
    "icons/icon32.png",
    "icons/icon48.png",
    "options.html",
    "popup.html",
    "snapshot.js",
  ]);
});

test("package names use the manifest version and a 7-character sha", () => {
  assert.deepEqual(packageNames("0.2.0", "ac5ef87"), {
    artifact: "autonote-extension-0.2.0-ac5ef87",
    filename: "autonote-extension-0.2.0-ac5ef87.zip",
  });
  assert.throws(() => packageNames("../x", "ac5ef87"), /version/);
  assert.throws(() => packageNames("0.2.0", "AC5EF87"), /sha/);
});

test("zip keeps manifest at the root and omits tests, dotfiles, and source maps", () => {
  withTempDir((dir) => {
    const extensionDir = join(dir, "extension");
    writeFixture(extensionDir, {
      "manifest.json": JSON.stringify({
        manifest_version: 3,
        name: "Fixture",
        version: "1.0.0",
        background: { service_worker: "background.js" },
        action: { default_popup: "popup.html", default_icon: { "16": "icons/icon16.png" } },
        options_ui: { page: "options.html" },
        content_scripts: [{ js: ["content.js"], css: ["content.css"] }],
        icons: { "16": "icons/icon16.png" },
      }),
      "background.js": "/* worker */",
      "popup.html": "<p>popup</p>",
      "options.html": "<p>options</p>",
      "content.js": "/* content */",
      "content.css": "body{}",
      "icons/icon16.png": "png",
      "keep.js": "/* kept */",
      ".env": "GEMINI_API_KEY=secret",
      ".hidden/note.txt": "hidden",
      "tests/secret.js": "secret",
      "nested/widget.test.js": "test",
      "nested/widget.spec.mjs": "spec",
      "vendor/app.js.map": "{}",
    });
    symlinkSync(join(extensionDir, "keep.js"), join(extensionDir, "link.js"));

    const collected = collectExtensionFiles(extensionDir);
    assert.equal(collected.includes(".env"), false);
    assert.equal(collected.includes("link.js"), false);
    assert.equal(collected.includes("tests/secret.js"), false);

    const zipPath = join(dir, "out.zip");
    createExtensionZip({ extensionDir, zipPath });
    const entries = listZipEntries(zipPath)
      .filter((entry) => !entry.endsWith("/"))
      .sort();
    assert.deepEqual(entries, [
      "background.js",
      "content.css",
      "content.js",
      "icons/icon16.png",
      "keep.js",
      "manifest.json",
      "options.html",
      "popup.html",
    ]);
    assert.equal(entries.includes("extension/manifest.json"), false);
  });
});

test("validation fails when manifest.json is nested or does not parse", () => {
  withTempDir((dir) => {
    const nested = join(dir, "nested");
    writeFixture(nested, { "extension/manifest.json": "{}" });
    const nestedZip = join(dir, "nested.zip");
    execFileSync("zip", ["-X", "-q", nestedZip, "extension/manifest.json"], { cwd: nested });
    assert.throws(() => validateExtensionZip(nestedZip), /not at the root/);

    const broken = join(dir, "broken");
    writeFixture(broken, { "manifest.json": "{" });
    const brokenZip = join(dir, "broken.zip");
    execFileSync("zip", ["-X", "-q", brokenZip, "manifest.json"], { cwd: broken });
    assert.throws(() => validateExtensionZip(brokenZip), /did not parse/);
  });
});

test("validation fails when a manifest path is missing from the zip", () => {
  withTempDir((dir) => {
    const extensionDir = join(dir, "extension");
    writeFixture(extensionDir, {
      "manifest.json": JSON.stringify({
        background: { service_worker: "background.js" },
        content_scripts: [{ js: ["missing.js"] }],
      }),
      "background.js": "/* worker */",
    });
    const zipPath = join(dir, "missing.zip");
    assert.throws(
      () => createExtensionZip({ extensionDir, zipPath }),
      /missing files referenced by manifest.json[\s\S]*missing\.js/,
    );
  });
});

test("package script writes the versioned zip and Actions output", () => {
  withTempDir((outputDir) => {
    const outputFile = join(outputDir, "github-output.txt");
    const stdout = execFileSync(process.execPath, ["scripts/package-extension.mjs"], {
      cwd: root,
      env: { ...process.env, GITHUB_OUTPUT: outputFile },
      encoding: "utf8",
    });
    const version = JSON.parse(readFileSync(join(root, "extension/manifest.json"), "utf8")).version;
    const sha = execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: root,
      encoding: "utf8",
    })
      .trim()
      .slice(0, 7);
    const filename = `autonote-extension-${version}-${sha}.zip`;
    const zipPath = join(root, "dist", filename);
    assert.equal(existsSync(zipPath), true);
    assert.match(stdout, new RegExp(filename));
    assert.match(stdout, /Validation passed/);
    assert.match(stdout, /^manifest\.json$/m);

    const output = readFileSync(outputFile, "utf8");
    assert.match(output, new RegExp(`^artifact=autonote-extension-${version}-${sha}$`, "m"));
    assert.match(output, new RegExp(`^zip=dist/${filename}$`, "m"));
    assert.match(
      output,
      new RegExp(`^stage=dist/autonote-extension-${version}-${sha}$`, "m"),
    );
    assert.equal(existsSync(join(root, "dist", `autonote-extension-${version}-${sha}`, "manifest.json")), true);

    const validated = validateExtensionZip(zipPath);
    assert.ok(validated.referenced.includes("background.js"));
    assert.ok(validated.referenced.includes("popup.html"));
    assert.ok(validated.referenced.includes("options.html"));
    assert.ok(validated.referenced.includes("content.js"));
    assert.ok(validated.referenced.includes("icons/icon16.png"));
  });
});
