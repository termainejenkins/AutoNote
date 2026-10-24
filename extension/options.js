import {
  GEMINI_ORIGIN,
  normalizeApiKey,
  redactSecret,
  sendKeyTest,
} from "./gemini.js";
import { mergeSettings } from "./settings.js";
import { readKey, readSettings, removeKey, writeKey, writeSettings } from "./storage-io.js";

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
      setStatus(result.message);
    } catch (error) {
      const raw = error instanceof Error ? error.message : "Network error";
      setStatus(redactSecret(`Could not reach Gemini. ${raw}`, key));
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

async function init() {
  byId("key-form").addEventListener("submit", (event) => onSave(event));
  byId("test-key").addEventListener("click", () => onTest());
  byId("clear-key").addEventListener("click", () => onClear());
  byId("send-consent").addEventListener("change", () => onConsentChange());
  byId("save-reading").addEventListener("click", () => onSaveReading());

  try {
    const saved = await readKey();
    byId("saved-hint").textContent = saved
      ? "A key is already saved on this device. The field stays empty so the key is not copied into the page. Test key uses the saved key unless you type a different one."
      : "No key is saved yet.";
    applySettings(await readSettings());
  } catch {
    setStatus("Could not read Chrome storage.");
  }
}

init();
