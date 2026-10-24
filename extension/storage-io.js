import { STORAGE_KEY } from "./gemini.js";
import { readingStorageKey } from "./read-state.js";
import { normalizeSettings, SETTINGS_KEY } from "./settings.js";
import { NOTES_KEY } from "./store.js";

export async function readSettings() {
  const stored = await globalThis.chrome.storage.local.get(SETTINGS_KEY);
  return normalizeSettings(stored[SETTINGS_KEY]);
}

export async function writeSettings(settings) {
  const safe = normalizeSettings(settings);
  await globalThis.chrome.storage.local.set({ [SETTINGS_KEY]: safe });
  return safe;
}

export async function readNotes() {
  const stored = await globalThis.chrome.storage.local.get(NOTES_KEY);
  return Array.isArray(stored[NOTES_KEY]) ? stored[NOTES_KEY] : [];
}

export async function writeNotes(notes) {
  await globalThis.chrome.storage.local.set({ [NOTES_KEY]: notes });
}

export async function readKey() {
  const stored = await globalThis.chrome.storage.local.get(STORAGE_KEY);
  const value = stored[STORAGE_KEY];
  return typeof value === "string" ? value : "";
}

export async function writeKey(key) {
  await globalThis.chrome.storage.local.set({ [STORAGE_KEY]: key });
}

export async function removeKey() {
  await globalThis.chrome.storage.local.remove(STORAGE_KEY);
}

export async function readReading(tabId) {
  const key = readingStorageKey(tabId);
  const stored = await globalThis.chrome.storage.session.get(key);
  return stored[key] || null;
}

export async function writeReading(tabId, state) {
  await globalThis.chrome.storage.session.set({ [readingStorageKey(tabId)]: state });
}

export async function removeReading(tabId) {
  await globalThis.chrome.storage.session.remove(readingStorageKey(tabId));
}
