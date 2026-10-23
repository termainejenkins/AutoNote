import assert from "node:assert/strict";
import { test } from "node:test";

import {
  buildKeyTestRequest,
  interpretKeyTestResponse,
  normalizeApiKey,
  redactSecret,
  sendKeyTest,
} from "../extension/gemini.js";

const SAMPLE_KEY = "unit-test-key";

test("normalizeApiKey strips whitespace and rejects non-strings", () => {
  assert.equal(normalizeApiKey("  abc def \n"), "abcdef");
  assert.equal(normalizeApiKey(""), "");
  assert.equal(normalizeApiKey(null), "");
});

test("buildKeyTestRequest makes a tiny GET and keeps the key out of the URL", () => {
  const request = buildKeyTestRequest(`  ${SAMPLE_KEY}  `);
  assert.equal(request.init.method, "GET");
  assert.equal(request.url.includes(SAMPLE_KEY), false);
  assert.equal(request.url.includes("pageSize=1"), true);
  assert.equal(request.init.body, undefined);
  assert.equal(request.init.headers["x-goog-api-key"], SAMPLE_KEY);
});

test("buildKeyTestRequest refuses an empty key", () => {
  assert.throws(() => buildKeyTestRequest("   "), /Enter a Gemini API key/);
});

test("interpretKeyTestResponse maps status codes without echoing a body", () => {
  assert.equal(interpretKeyTestResponse(200).ok, true);
  assert.match(interpretKeyTestResponse(200).message, /Key works/);
  assert.equal(interpretKeyTestResponse(401).ok, false);
  assert.match(interpretKeyTestResponse(403).message, /rejected/);
  assert.match(interpretKeyTestResponse(429).message, /rate-limited/);
  assert.match(interpretKeyTestResponse(500).message, /HTTP 500/);
  assert.equal(interpretKeyTestResponse(401).message.includes(SAMPLE_KEY), false);
});

test("redactSecret removes the key from a message", () => {
  const message = redactSecret(`failed for ${SAMPLE_KEY} today`, SAMPLE_KEY);
  assert.equal(message.includes(SAMPLE_KEY), false);
  assert.match(message, /\[redacted\]/);
});

test("sendKeyTest calls fetch once and does not put the key in the URL", async () => {
  const calls = [];
  const outcome = await sendKeyTest(SAMPLE_KEY, async (url, init) => {
    calls.push({ url, init });
    return { status: 200 };
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url.includes(SAMPLE_KEY), false);
  assert.equal(calls[0].init.headers["x-goog-api-key"], SAMPLE_KEY);
  assert.equal(outcome.result.ok, true);
  assert.equal(outcome.result.message.includes(SAMPLE_KEY), false);
});
