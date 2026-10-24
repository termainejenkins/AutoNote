/**
 * Zip extension/ so Chrome can load it unpacked, then fail if the archive is incomplete.
 *
 * Writes dist/autonote-extension-<manifest version>-<7-char sha>.zip with manifest.json
 * at the archive root. Tests, dotfiles, and source maps are left out. No npm packages:
 * this uses Node's built-ins plus the zip and unzip commands.
 *
 * Also extracts that zip to dist/<same name>/ for GitHub Actions. Actions always
 * downloads an artifact as a zip, so uploading the files (not the .zip) lets someone
 * unzip the artifact once and choose Load unpacked.
 */
import { execFileSync } from "node:child_process";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
} from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

const TEST_DIR_NAMES = new Set(["test", "tests", "__tests__"]);

export function isExcludedRelativePath(relativePath) {
  const parts = relativePath.split("/").filter(Boolean);
  if (parts.length === 0) return true;
  if (parts.some((part) => part.startsWith("."))) return true;
  if (parts.some((part) => TEST_DIR_NAMES.has(part))) return true;
  const base = parts[parts.length - 1];
  if (base.endsWith(".map")) return true;
  if (/\.(?:test|spec)\.(?:js|mjs|cjs)$/.test(base)) return true;
  return false;
}

export function collectExtensionFiles(extensionDir) {
  const files = [];

  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const absolute = join(dir, entry.name);
      const relativePath = relative(extensionDir, absolute).split(sep).join("/");
      if (entry.isSymbolicLink()) continue;
      if (isExcludedRelativePath(relativePath)) continue;
      if (entry.isDirectory()) {
        walk(absolute);
        continue;
      }
      if (entry.isFile()) files.push(relativePath);
    }
  };

  walk(extensionDir);
  files.sort((a, b) => a.localeCompare(b));
  return files;
}

function addManifestPath(files, value) {
  if (typeof value === "string") {
    const normalized = value.trim().replace(/\\/g, "/").replace(/^\.\//, "");
    if (normalized) files.push(normalized);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) addManifestPath(files, item);
  }
}

function addIconPaths(files, icons) {
  if (typeof icons === "string") {
    addManifestPath(files, icons);
    return;
  }
  if (!icons || typeof icons !== "object") return;
  for (const value of Object.values(icons)) addManifestPath(files, value);
}

/**
 * Files Chrome needs from the manifest: icons, service worker, popup, options,
 * and content scripts (js and css).
 */
export function filesReferencedByManifest(manifest) {
  if (manifest === null || typeof manifest !== "object" || Array.isArray(manifest)) {
    throw new Error("manifest.json must contain a JSON object");
  }

  const files = [];
  addIconPaths(files, manifest.icons);

  const action = manifest.action ?? manifest.browser_action ?? manifest.page_action;
  if (action && typeof action === "object") {
    addManifestPath(files, action.default_popup);
    addIconPaths(files, action.default_icon);
  }

  const background = manifest.background;
  if (background && typeof background === "object") {
    addManifestPath(files, background.service_worker);
    addManifestPath(files, background.scripts);
  }

  addManifestPath(files, manifest.options_page);
  if (manifest.options_ui && typeof manifest.options_ui === "object") {
    addManifestPath(files, manifest.options_ui.page);
  }

  if (Array.isArray(manifest.content_scripts)) {
    for (const entry of manifest.content_scripts) {
      if (!entry || typeof entry !== "object") continue;
      addManifestPath(files, entry.js);
      addManifestPath(files, entry.css);
    }
  }

  return [...new Set(files)].sort((a, b) => a.localeCompare(b));
}

function runCommand(command, args, options = {}) {
  try {
    return execFileSync(command, args, {
      encoding: "utf8",
      ...options,
    });
  } catch (error) {
    const stderr = error.stderr ? String(error.stderr).trim() : "";
    const detail = stderr || error.message;
    throw new Error(`${command} failed: ${detail}`);
  }
}

export function listZipEntries(zipPath) {
  const output = runCommand("unzip", ["-Z1", zipPath]);
  return output
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/\\/g, "/").replace(/^\.\//, ""))
    .filter(Boolean);
}

function readZipEntry(zipPath, entry) {
  return runCommand("unzip", ["-p", zipPath, entry]);
}

export function validateExtensionZip(zipPath) {
  const entries = listZipEntries(zipPath);
  for (const entry of entries) {
    if (entry.startsWith("/") || entry.split("/").includes("..")) {
      throw new Error(`Zip contains an unsafe path: ${entry}`);
    }
  }

  const files = new Set(entries.filter((entry) => !entry.endsWith("/")));
  if (!files.has("manifest.json")) {
    throw new Error("manifest.json is not at the root of the extension zip");
  }

  let manifest;
  try {
    manifest = JSON.parse(readZipEntry(zipPath, "manifest.json"));
  } catch (error) {
    throw new Error(`manifest.json in the zip did not parse: ${error.message}`);
  }

  const referenced = filesReferencedByManifest(manifest);
  const missing = [];
  for (const file of referenced) {
    if (file.startsWith("/") || file.split("/").includes("..")) {
      throw new Error(`Manifest references an unsafe path: ${file}`);
    }
    if (!files.has(file)) missing.push(file);
  }
  if (missing.length > 0) {
    throw new Error(
      `Extension zip is missing files referenced by manifest.json:\n${missing
        .map((file) => `- ${file}`)
        .join("\n")}`,
    );
  }

  return { entries, referenced };
}

export function packageNames(version, sha) {
  if (typeof version !== "string" || !/^\d+(\.\d+){0,3}$/.test(version)) {
    throw new Error(
      `manifest.json version must be numeric dotted parts, got ${JSON.stringify(version)}`,
    );
  }
  if (typeof sha !== "string" || !/^[0-9a-f]{7}$/.test(sha)) {
    throw new Error(`Expected a 7-character git sha, got ${JSON.stringify(sha)}`);
  }
  const artifact = `autonote-extension-${version}-${sha}`;
  return {
    artifact,
    filename: `${artifact}.zip`,
  };
}

function readManifestVersion(extensionDir) {
  const manifestPath = join(extensionDir, "manifest.json");
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch (error) {
    throw new Error(`Could not read ${manifestPath}: ${error.message}`);
  }
  return manifest.version;
}

function readShortSha(root) {
  const full = runCommand("git", ["rev-parse", "HEAD"], { cwd: root }).trim();
  if (!/^[0-9a-f]{40}$/.test(full)) {
    throw new Error(`Expected a full git sha, got ${JSON.stringify(full)}`);
  }
  return full.slice(0, 7);
}

export function createExtensionZip({ extensionDir, zipPath }) {
  const files = collectExtensionFiles(extensionDir);
  if (!files.includes("manifest.json")) {
    throw new Error("extension/manifest.json is missing; the zip needs it at the root");
  }

  mkdirSync(dirname(zipPath), { recursive: true });
  rmSync(zipPath, { force: true });
  const list = files.map((file) => (file.startsWith("-") ? `./${file}` : file)).join("\n");
  runCommand("zip", ["-X", "-q", zipPath, "-@"], {
    cwd: extensionDir,
    input: `${list}\n`,
  });
  const result = validateExtensionZip(zipPath);
  return { zipPath, files, ...result };
}

function setOutput(key, value) {
  const file = process.env.GITHUB_OUTPUT;
  if (!file) return;
  appendFileSync(file, `${key}=${value}\n`);
}

export function packageRepository(root = repoRoot) {
  const extensionDir = join(root, "extension");
  const distDir = join(root, "dist");
  const version = readManifestVersion(extensionDir);
  const sha = readShortSha(root);
  const names = packageNames(version, sha);
  const zipPath = join(distDir, names.filename);
  const created = createExtensionZip({ extensionDir, zipPath });

  const stageDir = join(distDir, names.artifact);
  rmSync(stageDir, { recursive: true, force: true });
  mkdirSync(stageDir, { recursive: true });
  runCommand("unzip", ["-q", zipPath, "-d", stageDir]);
  if (!existsSync(join(stageDir, "manifest.json"))) {
    throw new Error("Extracted package is missing manifest.json at its root");
  }
  for (const file of created.referenced) {
    if (!existsSync(join(stageDir, file))) {
      throw new Error(`Extracted package is missing ${file}`);
    }
  }

  const zipRelative = relative(root, zipPath).split(sep).join("/");
  const stageRelative = relative(root, stageDir).split(sep).join("/");
  return {
    artifact: names.artifact,
    zipPath,
    zipRelative,
    stageDir,
    stageRelative,
    version,
    sha,
    entries: created.entries,
    referenced: created.referenced,
  };
}

function isDirectExecution() {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return realpathSync(fileURLToPath(import.meta.url)) === realpathSync(entry);
  } catch {
    return import.meta.url === pathToFileURL(entry).href;
  }
}

function main() {
  const result = packageRepository();
  const listed = result.entries.filter((entry) => !entry.endsWith("/"));
  console.log(`Wrote ${result.zipRelative}`);
  for (const entry of listed) console.log(entry);
  console.log(
    `Validation passed: manifest.json parses at the zip root and ${result.referenced.length} referenced files are present.`,
  );
  setOutput("artifact", result.artifact);
  setOutput("zip", result.zipRelative);
  setOutput("stage", result.stageRelative);
}

if (isDirectExecution()) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
