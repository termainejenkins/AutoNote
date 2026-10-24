import {
  GEMINI_ORIGIN,
  normalizeApiKey,
  redactSecret,
  sendKeyTest,
} from "./gemini.js";
import {
  BUILTIN_BLOCK_RULES,
  addAllowDomain,
  addBlockPattern,
  removeAllowDomain,
  removeBlockPattern,
} from "./privacy.js";
import { appendSendLog, createSendLogEntry, modeLabel } from "./send-log.js";
import { mergeSettings } from "./settings.js";
import {
  clearSendLog,
  readKey,
  readSendLog,
  readSettings,
  removeKey,
  writeKey,
  writeSendLog,
  writeSettings,
} from "./storage-io.js";

const PAGE_ORIGINS = ["https://*/*", "http://*/*"];

function byId(id) {
  return globalThis.document.getElementById(id);
}

function setStatus(message) {
  byId("status").textContent = message;
}

function applySettings(settings) {
  byId("send-consent").checked = settings.sendConsent;
  byId("auto-enabled").checked = settings.autoEnabled;
  byId("note-style").value = settings.noteStyle;
  byId("study-seconds").value = String(settings.studySeconds);
  byId("study-scroll").value = String(settings.studyScrollPercent);
  byId("skim-seconds").value = String(settings.skimSeconds);
  byId("skim-scroll").value = String(settings.skimScrollPercent);
  const allow = byId("allowlist-enabled");
  if (allow) allow.checked = settings.allowlistEnabled === true;
}

function canBuildDom() {
  return typeof globalThis.document?.createElement === "function";
}

function renderPatternList(id, items, emptyText) {
  const root = byId(id);
  if (!root) return;
  if (!canBuildDom()) {
    root.textContent = items.length
      ? items.map((item) => (item.label ? `${item.label} (${item.pattern})` : item.pattern)).join(", ")
      : emptyText;
    return;
  }
  root.replaceChildren();
  if (items.length === 0) {
    const empty = globalThis.document.createElement("li");
    empty.textContent = emptyText;
    root.append(empty);
    return;
  }
  for (const item of items) {
    const row = globalThis.document.createElement("li");
    const text = globalThis.document.createElement("span");
    text.textContent = item.label ? `${item.label} · ${item.pattern}` : item.pattern;
    row.append(text);
    if (item.builtin) {
      const note = globalThis.document.createElement("span");
      note.className = "hint";
      note.textContent = "Built in";
      row.append(note);
    } else if (item.onRemove) {
      const button = globalThis.document.createElement("button");
      button.type = "button";
      button.className = "secondary";
      button.textContent = "Remove";
      button.addEventListener("click", () => item.onRemove(item.pattern));
      row.append(button);
    }
    root.append(row);
  }
}

function formatWhen(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString();
}

function logLine(entry) {
  const when = formatWhen(entry.time);
  const result = entry.ok ? "success" : (entry.error ? `error: ${entry.error}` : "error");
  if (entry.mode === "key-test") return `${when} — Key test — ${result}`;
  const title = entry.title || "Untitled";
  return `${when} — ${modeLabel(entry.mode)} — ${entry.characters} characters — ${result} — ${title} — ${entry.url}`;
}

function renderSendLog(entries) {
  const root = byId("send-log");
  if (!root) return;
  if (!canBuildDom()) {
    root.textContent = entries.length ? `${entries.length} sent` : "Nothing has been sent to Gemini yet.";
    return;
  }
  root.replaceChildren();
  if (entries.length === 0) {
    const empty = globalThis.document.createElement("p");
    empty.textContent = "Nothing has been sent to Gemini yet.";
    root.append(empty);
    return;
  }
  const list = globalThis.document.createElement("ul");
  list.className = "log-list";
  for (const entry of entries) {
    const row = globalThis.document.createElement("li");
    row.textContent = logLine(entry);
    list.append(row);
  }
  root.append(list);
}

async function renderPrivacy(settings) {
  const current = settings || await readSettings();
  const allow = byId("allowlist-enabled");
  if (allow) allow.checked = current.allowlistEnabled === true;
  renderPatternList(
    "builtin-rules",
    BUILTIN_BLOCK_RULES.map((rule) => ({ pattern: rule.pattern, label: rule.label, builtin: true })),
    "",
  );
  renderPatternList(
    "user-block-rules",
    current.blocklist.map((pattern) => ({ pattern, onRemove: (value) => onRemoveBlock(value) })),
    "None added.",
  );
  renderPatternList(
    "allow-rules",
    current.allowlist.map((pattern) => ({ pattern, onRemove: (value) => onRemoveAllow(value) })),
    "No domains added.",
  );
  try {
    renderSendLog(await readSendLog());
  } catch {
    renderSendLog([]);
  }
}

async function recordKeyTest(key, ok, error) {
  try {
    const current = await readSendLog();
    await writeSendLog(appendSendLog(current, createSendLogEntry({
      kind: "key-test",
      ok,
      error,
      apiKey: key,
      url: "https://generativelanguage.googleapis.com/v1beta/models?pageSize=1",
      title: "key test",
      characters: 99,
      text: "not page text and not stored",
    })));
  } catch {
    // The test result is still shown if the log cannot be saved.
  }
}

function settingsFromForm(current) {
  return mergeSettings(current, {
    sendConsent: byId("send-consent").checked,
    autoEnabled: byId("auto-enabled").checked,
    noteStyle: byId("note-style").value,
    studySeconds: byId("study-seconds").value,
    studyScrollPercent: byId("study-scroll").value,
    skimSeconds: byId("skim-seconds").value,
    skimScrollPercent: byId("skim-scroll").value,
  });
}

async function onSave(event) {
  event.preventDefault();
  const key = normalizeApiKey(byId("gemini-key").value);
  if (!key) {
    setStatus("Enter a Gemini API key to save it on this device.");
    return;
  }
  await writeKey(key);
  byId("gemini-key").value = "";
  byId("saved-hint").textContent =
    "A key is saved on this device. The field is cleared so the key is not left in the page. Test key uses the saved key unless you type a different one.";
  setStatus("Key saved in Chrome on this device. It is not synced.");
}

async function onClear() {
  await removeKey();
  byId("gemini-key").value = "";
  byId("saved-hint").textContent = "No key is saved yet.";
  setStatus("Saved key removed from this device.");
}

async function onTest() {
  const button = byId("test-key");
  button.disabled = true;
  try {
    const typed = normalizeApiKey(byId("gemini-key").value);
    const key = typed || (await readKey());
    if (!key) {
      setStatus("Enter a Gemini API key before testing.");
      return;
    }

    let granted = false;
    try {
      granted = await globalThis.chrome.permissions.request({
        origins: [GEMINI_ORIGIN],
      });
    } catch {
      setStatus("Chrome did not allow the Gemini permission request.");
      return;
    }
    if (!granted) {
      setStatus("Permission to contact Gemini was not granted. The key was not sent.");
      return;
    }

    try {
      const { result } = await sendKeyTest(key, globalThis.fetch);
      await recordKeyTest(key, result.ok, result.ok ? "" : result.message);
      await renderPrivacy();
      setStatus(result.message);
    } catch (error) {
      const raw = error instanceof Error ? error.message : "Network error";
      const message = redactSecret(`Could not reach Gemini. ${raw}`, key);
      await recordKeyTest(key, false, message);
      await renderPrivacy();
      setStatus(message);
    }
  } finally {
    button.disabled = false;
  }
}

async function onConsentChange() {
  const current = await readSettings();
  const consent = byId("send-consent").checked;
  const next = mergeSettings(current, {
    sendConsent: consent,
    autoEnabled: consent ? current.autoEnabled : false,
  });
  if (!consent) byId("auto-enabled").checked = false;
  await writeSettings(next);
  setStatus(
    consent
      ? "Notice confirmed. Page text can be sent when you generate a note or turn auto notes on."
      : "Notice cleared. AutoNote will not send page text.",
  );
}

async function onSaveReading() {
  const current = await readSettings();
  let next = settingsFromForm(current);
  if (next.autoEnabled && !next.sendConsent) {
    byId("auto-enabled").checked = false;
    next = mergeSettings(next, { autoEnabled: false });
    await writeSettings(next);
    setStatus("Confirm the notice before turning on auto notes.");
    return;
  }

  if (next.autoEnabled) {
    let granted = false;
    try {
      granted = await globalThis.chrome.permissions.request({
        origins: [GEMINI_ORIGIN, ...PAGE_ORIGINS],
      });
    } catch {
      granted = false;
    }
    if (!granted) {
      byId("auto-enabled").checked = false;
      next = mergeSettings(next, { autoEnabled: false });
      await writeSettings(next);
      setStatus("Auto notes stay off because site access was not granted. Manual generate can still work.");
      return;
    }
  } else {
    try {
      await globalThis.chrome.permissions.remove({ origins: PAGE_ORIGINS });
    } catch {
      // Removing optional access is best-effort.
    }
  }

  await writeSettings(next);
  setStatus(
    next.autoEnabled
      ? "Auto notes are on. A page is sent only after it meets the time and scroll settings, once per day."
      : "Reading settings saved. Auto notes are off.",
  );
}

async function onAddBlock(event) {
  event.preventDefault();
  const input = byId("block-pattern");
  const current = await readSettings();
  const result = addBlockPattern(current.blocklist, input.value);
  if (result.builtin) {
    setStatus("That rule is built in and already on. It can't be removed.");
    return;
  }
  if (result.duplicate) {
    setStatus("That rule is already on your blocklist.");
    return;
  }
  if (result.full) {
    setStatus("Your blocklist is full.");
    return;
  }
  if (!result.added) {
    setStatus("Enter a domain or a path pattern, such as notes.example.com or /billing.");
    return;
  }
  input.value = "";
  const next = await writeSettings(mergeSettings(current, { blocklist: result.list }));
  await renderPrivacy(next);
  setStatus("Added to your blocklist. Matching pages will not be sent.");
}

async function onRemoveBlock(pattern) {
  const current = await readSettings();
  if (removeBlockPattern(current.blocklist, pattern).length === current.blocklist.length) {
    setStatus("Built-in rules stay on. They can't be removed.");
    return;
  }
  const next = await writeSettings(mergeSettings(current, {
    blocklist: removeBlockPattern(current.blocklist, pattern),
  }));
  await renderPrivacy(next);
  setStatus("Removed from your blocklist.");
}

async function onAllowMode() {
  const current = await readSettings();
  const enabled = byId("allowlist-enabled").checked === true;
  const next = await writeSettings(mergeSettings(current, { allowlistEnabled: enabled }));
  await renderPrivacy(next);
  setStatus(enabled
    ? "Only these sites is on. Auto notes and Generate note run only on the domains you list."
    : "Only these sites is off. Auto notes and Generate note can run on any site that is not blocked.");
}

async function onAddAllow(event) {
  event.preventDefault();
  const input = byId("allow-domain");
  const current = await readSettings();
  const result = addAllowDomain(current.allowlist, input.value);
  if (result.duplicate) {
    setStatus("That domain is already in the list.");
    return;
  }
  if (result.full) {
    setStatus("The site list is full.");
    return;
  }
  if (!result.added) {
    setStatus("Enter a domain, such as docs.example.com.");
    return;
  }
  input.value = "";
  const next = await writeSettings(mergeSettings(current, { allowlist: result.list }));
  await renderPrivacy(next);
  setStatus("Domain added. It is used only while Only these sites is on.");
}

async function onRemoveAllow(domain) {
  const current = await readSettings();
  const next = await writeSettings(mergeSettings(current, {
    allowlist: removeAllowDomain(current.allowlist, domain),
  }));
  await renderPrivacy(next);
  setStatus("Domain removed from Only these sites.");
}

async function onClearLog() {
  await clearSendLog();
  await renderPrivacy();
  setStatus("Send log cleared from this device.");
}

async function init() {
  byId("key-form").addEventListener("submit", (event) => onSave(event));
  byId("test-key").addEventListener("click", () => onTest());
  byId("clear-key").addEventListener("click", () => onClear());
  byId("send-consent").addEventListener("change", () => onConsentChange());
  byId("save-reading").addEventListener("click", () => onSaveReading());
  byId("block-form").addEventListener("submit", (event) => onAddBlock(event));
  byId("allow-form").addEventListener("submit", (event) => onAddAllow(event));
  byId("allowlist-enabled").addEventListener("change", () => onAllowMode());
  byId("clear-log").addEventListener("click", () => onClearLog());

  try {
    const saved = await readKey();
    byId("saved-hint").textContent = saved
      ? "A key is already saved on this device. The field stays empty so the key is not copied into the page. Test key uses the saved key unless you type a different one."
      : "No key is saved yet.";
    const settings = await readSettings();
    applySettings(settings);
    await renderPrivacy(settings);
  } catch {
    setStatus("Could not read Chrome storage.");
  }
}

init();
