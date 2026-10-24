import assert from "node:assert/strict";
import { test } from "node:test";

import { allNotesToMarkdown, markdownFilename, topicToMarkdown } from "../extension/markdown.js";
import { groupNotes } from "../extension/store.js";

const notes = [
  {
    id: "early",
    topicKey: "docs.example.com/course/module",
    topicTitle: "course / module",
    url: "https://docs.example.com/course/module/early",
    title: "Early page",
    mode: "study",
    markdown: "Early summary.",
    createdAt: "2026-10-23T12:00:00.000Z",
  },
  {
    id: "late",
    topicKey: "docs.example.com/course/module",
    topicTitle: "course / module",
    url: "https://docs.example.com/course/module/late",
    title: "Late page",
    mode: "skim",
    markdown: "Late summary.",
    createdAt: "2026-10-23T18:00:00.000Z",
  },
];

test("topic markdown has one heading per page, a source link, and newest last", () => {
  const [group] = groupNotes(notes);
  const markdown = topicToMarkdown(group);
  assert.match(markdown, /^# course \/ module/);
  assert.match(markdown, /## Early page/);
  assert.match(markdown, /## Late page/);
  assert.match(markdown, /\[Source\]\(https:\/\/docs\.example\.com\/course\/module\/early\)/);
  assert.match(markdown, /\[Source\]\(https:\/\/docs\.example\.com\/course\/module\/late\)/);
  assert.ok(markdown.indexOf("## Early page") < markdown.indexOf("## Late page"));
  assert.match(markdown, /Early summary\./);
  assert.equal(markdown.endsWith("\n"), true);
});

test("all topics export and filenames stay plain", () => {
  const groups = groupNotes([
    ...notes,
    {
      ...notes[0],
      id: "other",
      topicKey: "example.com",
      topicTitle: "Example",
      url: "https://example.com/",
      title: "Home",
      markdown: "Home summary.",
    },
  ]);
  const markdown = allNotesToMarkdown(groups);
  assert.match(markdown, /^# /);
  assert.match(markdown, /# Example/);
  assert.equal(markdownFilename("Course / Module"), "course-module.md");
  assert.equal(markdownFilename("***"), "autonote.md");
});
