import { extractPage } from "./extract.js";
import { isPaused, mergeSettings, ruleFor } from "./settings.js";
import { readKey, readNotes, readReading, readSettings, writeSettings } from "./storage-io.js";
import { alreadyNoted, localDay } from "./store.js";

function byId(id) {
  return globalThis.document.getElementById(id);
}

function setStatus(message) {
  byId("status").textContent = message;
}

async function collectSnapshot() {
  const [tab] = await globalThis.chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return { tab: null, snapshot: null };
  try {
    const reply = await globalThis.chrome.tabs.sendMessage(tab.id, { type: "snapshot" });
    if (reply?.snapshot) return { tab, snapshot: reply.snapshot };
  } catch {
    // The content script runs only after auto notes have site access.
  }
  try {
    await globalThis.chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["snapshot.js"],
    });
    const [result] = await globalThis.chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => globalThis.autoNoteSnapshot(),
    });
    return { tab, snapshot: result?.result || null };
  } catch {
    return { tab, snapshot: null };
  }
}

function progressLine(settings, reading, url) {
  if (!settings.autoEnabled) {
    return "Auto notes are off. Nothing is sent unless you click Generate note.";
  }
  if (isPaused(settings, Date.now())) return "Auto notes are paused.";
  const rule = ruleFor(settings);
  if (!reading || reading.url !== url) {
    return `Auto notes are on. Waiting for ${rule.seconds}s visible and ${rule.scrollPercent}% scroll.`;
  }
  const seconds = Math.round(reading.elapsedMs / 1000);
  const scroll = Math.round(reading.maxScroll * 100);
  return `Auto: ${seconds}s / ${rule.seconds}s · scroll ${scroll}% / ${rule.scrollPercent}%.`;
}

async function render() {
  const settings = await readSettings();
  byId("note-style").value = settings.noteStyle;
  byId("pause-auto").textContent = isPaused(settings, Date.now())
    ? "Resume auto notes"
    : "Pause auto for 1 hour";

  const collected = await collectSnapshot();
  const snapshot = collected.snapshot;
  const extraction = snapshot
    ? extractPage(snapshot)
    : { status: "skipped", reason: "Chrome can't read this page.", url: collected.tab?.url || "" };
  const url = snapshot?.url || collected.tab?.url || "";
  byId("page-title").textContent = extraction.title || collected.tab?.title || "This page";

  if (extraction.status !== "ok") {
    byId("page-status").textContent = extraction.reason;
  } else {
    const notes = await readNotes();
    const saved = alreadyNoted(notes, extraction.url, localDay(new Date()));
    const savedLine = saved ? " A note for this page is already saved today." : "";
    byId("page-status").textContent =
      `Ready. Generate note sends the title, URL, ${extraction.headings.length} headings, and ${extraction.text.length} characters to Gemini.${savedLine}`;
  }

  const reading = collected.tab?.id != null ? await readReading(collected.tab.id) : null;
  byId("progress").textContent = progressLine(settings, reading, url);
  if (reading?.lastMessage && settings.autoEnabled) {
    setStatus(reading.lastMessage);
  }
}

async function onGenerate() {
  const button = byId("generate");
  button.disabled = true;
  try {
    const settings = await readSettings();
    if (!settings.sendConsent) {
      setStatus("Open options and confirm the notice before AutoNote can send page text to Gemini.");
      return;
    }
    if (!(await readKey())) {
      setStatus("Add a Gemini API key in options before generating a note.");
      return;
    }
    const collected = await collectSnapshot();
    if (!collected.snapshot) {
      setStatus("Chrome can't read this page.");
      return;
    }
    const extraction = extractPage(collected.snapshot);
    if (extraction.status !== "ok") {
      setStatus(extraction.reason);
      return;
    }
    const mode = byId("note-style").value === "skim" ? "skim" : "study";
    setStatus(
      `Sending ${extraction.text.length} characters from this page to Gemini for a ${mode} note…`,
    );
    const response = await globalThis.chrome.runtime.sendMessage({
      type: "generate",
      manual: true,
      mode,
      snapshot: collected.snapshot,
    });
    if (response?.ok && collected.tab?.id != null) {
      try {
        await globalThis.chrome.action.setBadgeText({ tabId: collected.tab.id, text: "OK" });
        await globalThis.chrome.action.setBadgeBackgroundColor({
          tabId: collected.tab.id,
          color: "#1f4b4a",
        });
      } catch {
        // The note is already saved if the badge cannot be updated.
      }
    }
    await render().catch(() => {});
    setStatus(response?.message || "AutoNote did not answer.");
  } catch {
    setStatus("AutoNote hit an unexpected error.");
  } finally {
    button.disabled = false;
  }
}

async function onStyleChange() {
  const current = await readSettings();
  await writeSettings(mergeSettings(current, {
    noteStyle: byId("note-style").value === "skim" ? "skim" : "study",
  }));
}

async function onPause() {
  const current = await readSettings();
  const paused = isPaused(current, Date.now());
  await writeSettings(mergeSettings(current, {
    pausedUntil: paused ? 0 : Date.now() + 60 * 60 * 1000,
  }));
  await render();
}

function init() {
  byId("generate").addEventListener("click", () => onGenerate());
  byId("note-style").addEventListener("change", () => onStyleChange());
  byId("pause-auto").addEventListener("click", () => onPause());
  byId("open-notes").addEventListener("click", () => {
    globalThis.chrome.tabs.create({ url: globalThis.chrome.runtime.getURL("notes.html") });
  });
  byId("open-options").addEventListener("click", () => {
    globalThis.chrome.runtime.openOptionsPage();
  });
  render().catch(() => setStatus("Could not read this page."));
}

init();
