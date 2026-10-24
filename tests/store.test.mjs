import assert from "node:assert/strict";
import { test } from "node:test";

import {
  addNote,
  alreadyNoted,
  canonicalUrl,
  createNote,
  deleteNote,
  groupNotes,
  localDay,
  renameTopic,
  topicKeyFromUrl,
} from "../extension/store.js";

function note(url, title, createdAt) {
  return createNote([], {
    url,
    title,
    mode: "study",
    markdown: title,
    createdAt,
    id: title,
  });
}

test("five pages under one docs path share a topic", () => {
  const urls = ["a", "b", "c", "d", "e"].map(
    (name) => `https://docs.example.com/course/module/${name}`,
  );
  assert.equal(topicKeyFromUrl(urls[0]), "docs.example.com/course/module");
  const notes = urls.map((url, index) => note(url, `Page ${index}`, `2026-10-23T0${index}:00:00.000Z`));
  const other = note("https://other.example.com/course/module/a", "Other", "2026-10-23T05:00:00.000Z");
  const groups = groupNotes([...notes, other]);
  const course = groups.find((group) => group.topicKey === "docs.example.com/course/module");
  assert.equal(course.notes.length, 5);
  assert.deepEqual(course.notes.map((item) => item.title), ["Page 0", "Page 1", "Page 2", "Page 3", "Page 4"]);
  assert.equal(groups.some((group) => group.topicKey === "other.example.com/course/module"), true);
});

test("rename sticks for the next page, hashes do not split a day, and delete removes one note", () => {
  const first = note("https://docs.example.com/guide/start", "Start", "2026-10-23T12:00:00.000Z");
  let notes = addNote([], first);
  notes = renameTopic(notes, first.topicKey, "Field guide");
  const second = createNote(notes, {
    url: "https://docs.example.com/guide/start#section",
    title: "Start again",
    mode: "skim",
    markdown: "Again",
    createdAt: "2026-10-23T13:00:00.000Z",
    id: "second",
  });
  assert.equal(second.topicTitle, "Field guide");
  assert.equal(second.url, canonicalUrl("https://docs.example.com/guide/start#section"));
  notes = addNote(notes, second);
  const day = localDay(second.createdAt);
  assert.equal(alreadyNoted(notes, "https://docs.example.com/guide/start#later", day), true);
  notes = deleteNote(notes, "second");
  assert.equal(notes.length, 1);
  assert.equal(alreadyNoted(notes, second.url, day), true);
});
