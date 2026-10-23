import { decideSend } from "./decide.js";
import { extractPage } from "./extract.js";
import { generateNote, redactSecret } from "./gemini.js";
import { buildPrompt, renderNoteMarkdown } from "./prompts.js";
import { meetsThreshold, reduceReading } from "./read-state.js";
import { isPaused, ruleFor } from "./settings.js";
import {
  readKey,
  readNotes,
  readReading,
  readSettings,
  removeReading,
  writeNotes,
  writeReading,
} from "./storage-io.js";
import { addNote, alreadyNoted, createNote, localDay } from "./store.js";

console.info("AutoNote service worker started");

globalThis.chrome.runtime.onInstalled.addListener((details) => {
  console.info(`AutoNote service worker installed (${details.reason})`);
});

const chains = new Map();

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
  const key = await readKey();
  const extraction = snapshot
    ? extractPage(snapshot)
    : { status: "skipped", reason: "This page can't be read.", url: "" };
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
  let generated;
  try {
    generated = await generateNote(key, prompt, globalThis.fetch);
  } catch (error) {
    const raw = error instanceof Error ? error.message : "Network error";
    return {
      ok: false,
      code: "network",
      message: redactSecret(`Could not reach Gemini. ${raw}`, key),
    };
  }
  if (!generated.result.ok) {
    return { ok: false, code: "gemini", message: generated.result.message };
  }
  const rendered = renderNoteMarkdown(mode, generated.result.json);
  if (!rendered.ok) return { ok: false, code: "empty", message: rendered.message };

  const note = createNote(notes, {
    url: extraction.url,
    title: extraction.title,
    mode,
    markdown: rendered.markdown,
    createdAt: new Date().toISOString(),
  });
  await writeNotes(addNote(notes, note));
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

  try {
    await showBadge(tabId, "…");
    const reply = await globalThis.chrome.tabs.sendMessage(tabId, { type: "snapshot" });
    const outcome = await createNoteFromSnapshot({
      snapshot: reply?.snapshot,
      mode: settings.noteStyle,
      manual: false,
    });
    state = {
      ...state,
      sent: outcome.ok || outcome.code === "duplicate" || outcome.code === "skipped",
      holdCode: outcome.ok ? "" : outcome.code,
      holdUntil: outcome.ok || outcome.code === "duplicate" || outcome.code === "skipped"
        ? 0
        : message.now + 60000,
      lastMessage: outcome.message,
    };
    if (outcome.ok) await showBadge(tabId, "OK");
    else if (outcome.code !== "duplicate" && outcome.code !== "paused" && outcome.code !== "auto-off") {
      await showBadge(tabId, "!");
    }
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
