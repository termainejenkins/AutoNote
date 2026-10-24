import assert from "node:assert/strict";
import { test } from "node:test";

import { appendSendLog, createSendLogEntry, SEND_LOG_LIMIT } from "../extension/send-log.js";

const PAGE_TEXT = "The full page text that must never be stored in the send log.";
const SAMPLE_KEY = "unit-test-key";

function entry(index, extra = {}) {
  return {
    time: new Date(Date.UTC(2026, 0, 1, 0, 0, index)).toISOString(),
    url: `https://docs.example.com/page-${index}`,
    title: `Title ${index}`,
    mode: index % 2 === 0 ? "study" : "skim",
    characters: 100 + index,
    ok: index % 3 !== 0,
    error: index % 3 === 0 ? `Gemini rejected ${SAMPLE_KEY}` : "",
    text: `${PAGE_TEXT} ${index}`,
    prompt: `${PAGE_TEXT} ${index}`,
    apiKey: SAMPLE_KEY,
    pageText: PAGE_TEXT,
    headers: { "x-goog-api-key": SAMPLE_KEY },
    ...extra,
  };
}

test("log entries keep time, url, title, mode, count, and result, and drop text and keys", () => {
  assert.equal(SEND_LOG_LIMIT, 200);
  const failed = createSendLogEntry(entry(3, {
    ok: false,
    mode: "Study",
    title: `Notes about ${SAMPLE_KEY}`,
    url: `https://docs.example.com/page-3?q=${SAMPLE_KEY}`,
  }));
  assert.deepEqual(Object.keys(failed).sort(), ["characters", "error", "mode", "ok", "time", "title", "url"]);
  assert.equal(failed.mode, "study");
  assert.equal(failed.characters, 103);
  assert.equal(failed.ok, false);
  assert.match(failed.error, /\[redacted\]/);
  assert.equal(failed.url.includes(SAMPLE_KEY), false);
  assert.match(failed.url, /\[redacted\]/);
  assert.equal(failed.title.includes(SAMPLE_KEY), false);
  assert.equal(JSON.stringify(failed).includes(PAGE_TEXT), false);
  assert.equal(JSON.stringify(failed).includes(SAMPLE_KEY), false);
  assert.equal(failed.text, undefined);
  assert.equal(failed.apiKey, undefined);
  assert.equal(failed.prompt, undefined);
  assert.equal(failed.headers, undefined);

  const skim = createSendLogEntry({
    time: "2026-10-24T15:04:05.000Z",
    url: "https://docs.example.com/skim",
    title: "Skim title",
    mode: "Skim",
    characters: "80",
    ok: true,
    error: `should drop ${SAMPLE_KEY} and ${PAGE_TEXT}`,
    text: PAGE_TEXT,
    apiKey: SAMPLE_KEY,
  });
  assert.equal(skim.mode, "skim");
  assert.equal(skim.characters, 80);
  assert.equal(skim.ok, true);
  assert.equal(skim.error, "");
  assert.equal(JSON.stringify(skim).includes(PAGE_TEXT), false);
  assert.equal(JSON.stringify(skim).includes(SAMPLE_KEY), false);
});

test("key tests are logged with no url, title, or page text", () => {
  const logged = createSendLogEntry({
    kind: "key-test",
    ok: false,
    url: `https://generativelanguage.googleapis.com/v1beta/models?key=${SAMPLE_KEY}`,
    title: "model list",
    characters: 400,
    error: `rejected ${SAMPLE_KEY}`,
    text: PAGE_TEXT,
    apiKey: SAMPLE_KEY,
    time: "2026-10-24T15:04:05.000Z",
  });
  assert.equal(logged.mode, "key-test");
  assert.equal(logged.url, "");
  assert.equal(logged.title, "");
  assert.equal(logged.characters, 0);
  assert.equal(logged.ok, false);
  assert.equal(logged.error.includes(SAMPLE_KEY), false);
  assert.equal(JSON.stringify(logged).includes(PAGE_TEXT), false);
  assert.equal(JSON.stringify(logged).includes(SAMPLE_KEY), false);
  assert.equal(JSON.stringify(logged).includes("generativelanguage.googleapis.com"), false);
});

test("the send log keeps the newest 200 entries and redacts older poisoned rows", () => {
  let log = [
    {
      time: "2026-10-24T00:00:00.000Z",
      url: "https://docs.example.com/old",
      title: "Old",
      mode: "study",
      characters: 12,
      ok: true,
      error: "",
      text: PAGE_TEXT,
      apiKey: SAMPLE_KEY,
      prompt: `${PAGE_TEXT} ${SAMPLE_KEY}`,
    },
  ];
  for (let index = 0; index < SEND_LOG_LIMIT + 5; index += 1) {
    log = appendSendLog(log, entry(index));
  }
  assert.equal(log.length, SEND_LOG_LIMIT);
  assert.equal(log[0].url, `https://docs.example.com/page-${SEND_LOG_LIMIT + 4}`);
  assert.equal(log.at(-1).url, "https://docs.example.com/page-5");
  assert.equal(log.some((item) => item.url.endsWith("/page-0")), false);
  assert.equal(log.some((item) => item.url.endsWith("/old")), false);
  const serialized = JSON.stringify(log);
  assert.equal(serialized.includes(PAGE_TEXT), false);
  assert.equal(serialized.includes(SAMPLE_KEY), false);
  assert.equal(serialized.includes("x-goog-api-key"), false);
  for (const item of log) {
    assert.deepEqual(Object.keys(item).sort(), ["characters", "error", "mode", "ok", "time", "title", "url"]);
    assert.equal(item.text, undefined);
    assert.equal(item.apiKey, undefined);
  }
});
