import {
  GEMINI_ORIGIN,
  STORAGE_KEY,
  normalizeApiKey,
  redactSecret,
  sendKeyTest,
} from "./gemini.js";

function byId(id) {
  return globalThis.document.getElementById(id);
}

function setStatus(message) {
  byId("status").textContent = message;
}

async function readSavedKey() {
  const stored = await globalThis.chrome.storage.local.get(STORAGE_KEY);
  const value = stored[STORAGE_KEY];
  return typeof value === "string" ? value : "";
}

async function saveKey(key) {
  await globalThis.chrome.storage.local.set({ [STORAGE_KEY]: key });
}

async function clearSavedKey() {
  await globalThis.chrome.storage.local.remove(STORAGE_KEY);
}

async function onSave(event) {
  event.preventDefault();
  const key = normalizeApiKey(byId("gemini-key").value);
  if (!key) {
    setStatus("Enter a Gemini API key to save it on this device.");
    return;
  }
  await saveKey(key);
  byId("gemini-key").value = "";
  byId("saved-hint").textContent =
    "A key is saved on this device. The field is cleared so the key is not left in the page. Test key uses the saved key unless you type a different one.";
  setStatus("Key saved in Chrome on this device. It is not synced.");
}

async function onClear() {
  await clearSavedKey();
  byId("gemini-key").value = "";
  byId("saved-hint").textContent = "No key is saved yet.";
  setStatus("Saved key removed from this device.");
}

async function onTest() {
  const button = byId("test-key");
  button.disabled = true;
  try {
    const typed = normalizeApiKey(byId("gemini-key").value);
    const key = typed || (await readSavedKey());
    if (!key) {
      setStatus("Enter a Gemini API key before testing.");
      return;
    }

    let granted = false;
    try {
      granted = await globalThis.chrome.permissions.request({
        origins: [GEMINI_ORIGIN],
      });
    } catch (error) {
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

function init() {
  byId("key-form").addEventListener("submit", (event) => onSave(event));
  byId("test-key").addEventListener("click", () => onTest());
  byId("clear-key").addEventListener("click", () => onClear());

  readSavedKey()
    .then((saved) => {
      byId("saved-hint").textContent = saved
        ? "A key is already saved on this device. The field stays empty so the key is not copied into the page. Test key uses the saved key unless you type a different one."
        : "No key is saved yet.";
    })
    .catch(() => {
      setStatus("Could not read Chrome storage.");
    });
}

init();
