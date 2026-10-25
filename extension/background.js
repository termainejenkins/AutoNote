import { decideSend } from "./decide.js";
import { extractPage } from "./extract.js";
import { generateNote, redactSecret } from "./gemini.js";
import { gatePage } from "./privacy.js";
import { buildPrompt, renderNoteMarkdown } from "./prompts.js";
import { meetsThreshold, reduceReading } from "./read-state.js";
import { appendSendLog, createSendLogEntry } from "./send-log.js";
import { isPaused, ruleFor } from "./settings.js";
import {
  readKey,
  readNotes,
  readReading,
  readSendLog,
  readSettings,
  removeReading,
  writeNotes,
  writeReading,
  writeSendLog,
} from "./storage-io.js";
import {
  BADGE_COLOR,
  SESSION_COUNT_KEY,
  incrementSessionCount,
  loadSessionCount,
  sessionBadgeUpdate,
} from "./session-count.js";
import { addNote, alreadyNoted, createNote, localDay } from "./store.js";

console.info("AutoNote service worker started");

globalThis.chrome.runtime.onInstalled.addListener((details) => {
  console.info(`AutoNote service worker installed (${details.reason})`);
});

const chains = new Map();
let logWrite = Promise.resolve();

function recordSend(details) {
  const entry = createSendLogEntry({
    time: new Date().toISOString(),
    ...details,
  });
  logWrite = logWrite.then(async () => {
    const current = await readSendLog();
    await writeSendLog(appendSendLog(current, entry));
  }).catch(() => {});
  return logWrite;
}

const QUIET_CODES = new Set(["duplicate", "paused", "auto-off"]);

let sessionCountWrite = Promise.resolve();

async function readSessionCount() {
  const stored = await globalThis.chrome.storage.session.get(SESSION_COUNT_KEY);
  return loadSessionCount(stored);
}

async function showSessionBadge(count) {
  const update = sessionBadgeUpdate(count);
  try {
    await globalThis.chrome.action.setBadgeText({ text: update.text });
    await globalThis.chrome.action.setBadgeBackgroundColor({ color: update.color });
    await globalThis.chrome.action.setTitle({ title: update.title });
  } catch {
    // The badge is a hint. A failed update does not change the saved note.
  }
}

function recordSessionNote() {
  const run = sessionCountWrite.then(async () => {
    const next = incrementSessionCount(await readSessionCount());
    await globalThis.chrome.storage.session.set({ [SESSION_COUNT_KEY]: next });
    await showSessionBadge(next);
  });
  sessionCountWrite = run.catch(() => {});
  return sessionCountWrite;
}

function restoreSessionBadge() {
  const run = sessionCountWrite.then(async () => {
    await showSessionBadge(await readSessionCount());
  });
  sessionCountWrite = run.catch(() => {});
  return sessionCountWrite;
}

restoreSessionBadge();

function enqueue(tabId, task) {
  const previous = chains.get(tabId) || Promise.resolve();
  const next = previous.then(task, task).catch(() => {});
  chains.set(tabId, next);
  return next;
}

async function showBadge(tabId, text) {
  if (tabId == null) return;
  try {
    await globalThis.chrome.action.setBadgeText({ tabId, text });
    if (text) {
      await globalThis.chrome.action.setBadgeBackgroundColor({
        tabId,
        color: text === "!" ? "#8a1c1c" : "#1f4b4a",
      });
    }
  } catch {
    // Badge updates are a hint, not part of saving the note.
  }
}

async function createNoteFromSnapshot({ snapshot, mode, manual }) {
  const settings = await readSettings();
  const snapshotUrl = typeof snapshot?.url === "string" ? snapshot.url : "";
  if (snapshotUrl) {
    const gate = gatePage(snapshotUrl, settings);
    if (!gate.ok) return { ok: false, code: gate.code, message: gate.message };
  }
  const key = await readKey();
  const extraction = snapshot
    ? extractPage(snapshot)
    : { status: "skipped", reason: "This page can't be read.", url: "" };
  if (extraction.status === "ok" && extraction.url && extraction.url !== snapshotUrl) {
    const gate = gatePage(extraction.url, settings);
    if (!gate.ok) return { ok: false, code: gate.code, message: gate.message };
  }
  const notes = await readNotes();
  const decision = decideSend({
    manual,
    consent: settings.sendConsent,
    hasKey: Boolean(key),
    autoEnabled: settings.autoEnabled,
    paused: isPaused(settings, Date.now()),
    alreadyToday: extraction.url ? alreadyNoted(notes, extraction.url, localDay(new Date())) : false,
    extraction,
  });
  if (!decision.ok) return decision;

  const prompt = buildPrompt({
    mode,
    title: extraction.title,
    url: extraction.url,
    headings: extraction.headings,
    text: extraction.text,
  });
  const sent = {
    url: extraction.url,
    title: extraction.title,
    mode,
    characters: extraction.text.length,
    apiKey: key,
    text: extraction.text,
  };
  let generated;
  try {
    generated = await generateNote(key, prompt, globalThis.fetch);
  } catch (error) {
    const raw = error instanceof Error ? error.message : "Network error";
    const message = redactSecret(`Could not reach Gemini. ${raw}`, key);
    await recordSend({ ...sent, ok: false, error: message });
    return { ok: false, code: "network", message };
  }
  if (!generated.result.ok) {
    await recordSend({ ...sent, ok: false, error: generated.result.message });
    return { ok: false, code: "gemini", message: generated.result.message };
  }
  const rendered = renderNoteMarkdown(mode, generated.result.json);
  if (!rendered.ok) {
    await recordSend({ ...sent, ok: false, error: rendered.message });
    return { ok: false, code: "empty", message: rendered.message };
  }

  const note = createNote(notes, {
    url: extraction.url,
    title: extraction.title,
    mode,
    markdown: rendered.markdown,
    createdAt: new Date().toISOString(),
  });
  await writeNotes(addNote(notes, note));
  await recordSend({ ...sent, ok: true, error: "" });
  await recordSessionNote();
  return {
    ok: true,
    code: "saved",
    message: "Note saved on this device.",
    topicKey: note.topicKey,
    title: note.title,
  };
}

async function handleTick(message, sender) {
  const tabId = sender?.tab?.id;
  if (tabId == null || typeof message.url !== "string") return;
  const settings = await readSettings();
  let state = reduceReading(await readReading(tabId), {
    url: message.url,
    now: message.now,
    visible: message.visible === true,
    idle: message.idle === true,
    scrollDepth: message.scrollDepth,
  });
  const ready = meetsThreshold(state, ruleFor(settings));
  const quietHold = state.holdUntil > message.now;
  if (!ready || !settings.autoEnabled || state.sent || quietHold) {
    await writeReading(tabId, state);
    return;
  }

  const gate = gatePage(message.url, settings);
  if (!gate.ok) {
    state = {
      ...state,
      sent: true,
      holdCode: gate.code,
      holdUntil: 0,
      lastMessage: gate.message,
    };
    await writeReading(tabId, state);
    await showBadge(tabId, "!");
    return;
  }

  try {
    await showBadge(tabId, "…");
    const reply = await globalThis.chrome.tabs.sendMessage(tabId, { type: "snapshot" });
    const outcome = await createNoteFromSnapshot({
      snapshot: reply?.snapshot,
      mode: settings.noteStyle,
      manual: false,
    });
    const settled = outcome.ok || outcome.code === "duplicate" || outcome.code === "skipped";
    state = {
      ...state,
      sent: settled,
      holdCode: outcome.ok ? "" : outcome.code,
      holdUntil: settled ? 0 : message.now + 60000,
      lastMessage: outcome.message,
    };
    if (outcome.ok) {
      await showBadge(tabId, "");
      try {
        await globalThis.chrome.action.setBadgeBackgroundColor({ tabId, color: BADGE_COLOR });
      } catch {
        // Clearing the progress badge is enough for the session count to show.
      }
    } else if (!QUIET_CODES.has(outcome.code)) await showBadge(tabId, "!");
  } catch {
    state = {
      ...state,
      holdCode: "unread",
      holdUntil: message.now + 60000,
      lastMessage: "AutoNote could not read this page.",
    };
    await showBadge(tabId, "!");
  }
  await writeReading(tabId, state);
}

globalThis.chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || typeof message.type !== "string") return false;
  if (message.type === "reading-tick") {
    const tabId = sender?.tab?.id ?? "unknown";
    enqueue(tabId, () => handleTick(message, sender));
    return false;
  }
  if (message.type !== "generate") return false;
  createNoteFromSnapshot({
    snapshot: message.snapshot,
    mode: message.mode === "skim" ? "skim" : "study",
    manual: true,
  })
    .then(sendResponse)
    .catch(() => {
      sendResponse({ ok: false, code: "error", message: "AutoNote hit an unexpected error." });
    });
  return true;
});

globalThis.chrome.tabs.onRemoved.addListener((tabId) => {
  removeReading(tabId).catch(() => {});
});
