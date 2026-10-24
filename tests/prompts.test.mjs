import assert from "node:assert/strict";
import { test } from "node:test";

import { TEXT_LIMIT } from "../extension/extract.js";
import { buildPrompt, renderNoteMarkdown } from "../extension/prompts.js";

const page = {
  title: "Photosynthesis",
  url: "https://docs.example.com/course/module/overview",
  headings: ["Light reactions"],
  text: "Plants convert light into chemical energy stored in glucose.",
};

test("Study and Skim prompts describe different JSON shapes and include the page", () => {
  const study = buildPrompt({ ...page, mode: "study" });
  const skim = buildPrompt({ ...page, mode: "skim" });
  assert.match(study, /questions has exactly 3/);
  assert.match(study, /Plants convert light into chemical energy/);
  assert.match(study, /Light reactions/);
  assert.match(skim, /takeaways has 3 to 5/);
  assert.equal(skim.includes("exactly 3"), false);
  assert.equal(study.includes("unit-test-key"), false);
  assert.equal(skim.includes("x-goog-api-key"), false);
});

test("prompts cap extracted text", () => {
  const prompt = buildPrompt({
    mode: "study",
    title: "Long",
    url: "https://example.com/docs/long",
    headings: [],
    text: `${"a".repeat(TEXT_LIMIT)}END_MARKER`,
  });
  assert.equal(prompt.includes("END_MARKER"), false);
  assert.ok(prompt.includes("a".repeat(100)));
});

test("model JSON renders to Study and Skim markdown", () => {
  const study = renderNoteMarkdown("study", {
    summary: "Plants store energy.",
    keyTerms: [{ term: "Glucose", meaning: "A sugar." }],
    questions: ["What is stored?", "Where?", "Why?"],
  });
  assert.equal(study.ok, true);
  assert.match(study.markdown, /Plants store energy/);
  assert.match(study.markdown, /\*\*Glucose:\*\*/);
  assert.match(study.markdown, /3\. Why\?/);

  const skim = renderNoteMarkdown("skim", {
    summary: "Caching is hard. Stale data is the usual bug.",
    takeaways: ["Know the lifetime", "Invalidate on write"],
  });
  assert.equal(skim.ok, true);
  assert.match(skim.markdown, /^- Know the lifetime/m);
  assert.equal(renderNoteMarkdown("study", { summary: "  " }).ok, false);
});
