export const NOTES_KEY = "autonoteNotes";

export function canonicalUrl(url) {
  const parsed = new URL(url);
  parsed.hash = "";
  return parsed.toString();
}

export function topicKeyFromUrl(url) {
  const parsed = new URL(url);
  const segments = parsed.pathname.split("/").filter(Boolean).slice(0, 2);
  return segments.length ? `${parsed.hostname}/${segments.join("/")}` : parsed.hostname;
}

export function defaultTopicTitle(topicKey) {
  const parts = String(topicKey).split("/");
  return parts.length > 1 ? parts.slice(1).join(" / ") : parts[0];
}

export function localDay(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function alreadyNoted(notes, url, day) {
  let canonical = "";
  try {
    canonical = canonicalUrl(url);
  } catch {
    return false;
  }
  return notes.some((note) => note.url === canonical && localDay(note.createdAt) === day);
}

export function createNote(notes, fields) {
  const url = canonicalUrl(fields.url);
  const topicKey = topicKeyFromUrl(url);
  const existing = notes.find((note) => note.topicKey === topicKey);
  return {
    id: fields.id || globalThis.crypto.randomUUID(),
    topicKey,
    topicTitle: existing?.topicTitle || defaultTopicTitle(topicKey),
    url,
    title: fields.title,
    mode: fields.mode === "skim" ? "skim" : "study",
    markdown: fields.markdown,
    createdAt: fields.createdAt,
  };
}

export function addNote(notes, note) {
  return [...notes, note];
}

export function deleteNote(notes, id) {
  return notes.filter((note) => note.id !== id);
}

export function renameTopic(notes, topicKey, topicTitle) {
  const title = String(topicTitle || "").trim();
  if (!title) return notes.slice();
  return notes.map((note) => (note.topicKey === topicKey ? { ...note, topicTitle: title } : note));
}

export function groupNotes(notes) {
  const groups = new Map();
  for (const note of notes) {
    if (!groups.has(note.topicKey)) {
      groups.set(note.topicKey, {
        topicKey: note.topicKey,
        topicTitle: note.topicTitle || defaultTopicTitle(note.topicKey),
        notes: [],
      });
    }
    const group = groups.get(note.topicKey);
    group.topicTitle = note.topicTitle || group.topicTitle;
    group.notes.push(note);
  }
  for (const group of groups.values()) {
    group.notes.sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
  }
  return [...groups.values()].sort((a, b) => a.topicTitle.localeCompare(b.topicTitle));
}
