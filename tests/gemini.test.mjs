import assert from "node:assert/strict";
import { test } from "node:test";

import {
  GEMINI_MODEL,
  buildGenerateRequest,
  buildKeyTestRequest,
  generateNote,
  interpretKeyTestResponse,
  normalizeApiKey,
  parseGenerateResponse,
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
  assert.equal(interpretKeyTestResponse(404).message, "Gemini test failed (HTTP 404).");
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

test("generateNote posts the prompt once and keeps the key out of the URL and body", async () => {
  const prompt = "Write a study note about photosynthesis.";
  const calls = [];
  const body = JSON.stringify({
    candidates: [
      {
        content: {
          parts: [
            {
              text: JSON.stringify({
                summary: "Plants store energy.",
                keyTerms: [],
                questions: ["One", "Two", "Three"],
              }),
            },
          ],
        },
      },
    ],
  });
  const outcome = await generateNote(SAMPLE_KEY, prompt, async (url, init) => {
    calls.push({ url, init });
    return { status: 200, text: async () => body };
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].init.method, "POST");
  assert.equal(calls[0].url.includes(SAMPLE_KEY), false);
  assert.equal(calls[0].url.includes(`models/${GEMINI_MODEL}:generateContent`), true);
  assert.equal(GEMINI_MODEL, "gemini-3.5-flash-lite");
  assert.equal(calls[0].init.body.includes(SAMPLE_KEY), false);
  assert.equal(calls[0].init.body.includes(prompt), true);
  assert.equal(calls[0].init.headers["x-goog-api-key"], SAMPLE_KEY);
  assert.equal(outcome.result.ok, true);
  assert.equal(outcome.result.json.summary, "Plants store energy.");
  assert.equal(outcome.result.message.includes(SAMPLE_KEY), false);
});

test("a rejected generate call does not echo the response body", async () => {
  const outcome = await generateNote(SAMPLE_KEY, "Prompt text", async () => ({
    status: 401,
    text: async () => `{"error":"${SAMPLE_KEY}"}`,
  }));
  assert.equal(outcome.result.ok, false);
  assert.match(outcome.result.message, /rejected/);
  assert.equal(outcome.result.message.includes(SAMPLE_KEY), false);
  assert.throws(() => buildGenerateRequest("  ", "Prompt text"), /Add a Gemini API key/);
});

test("buildGenerateRequest keeps the generateContent body and the 3.5 model", () => {
  const request = buildGenerateRequest(SAMPLE_KEY, "Prompt text");
  assert.equal(
    request.url,
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent",
  );
  assert.equal(request.url.includes("gemini-2.5-flash-lite"), false);
  assert.deepEqual(JSON.parse(request.init.body), {
    contents: [{ role: "user", parts: [{ text: "Prompt text" }] }],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 2048,
      responseMimeType: "application/json",
    },
  });
});

test("a 404 from note generation says the model may be unavailable and does not echo the body or key", async () => {
  const leaked = `models/gemini-2.5-flash-lite is not found for ${SAMPLE_KEY}`;
  let readBody = false;
  const parsed = parseGenerateResponse(404);
  assert.equal(parsed.ok, false);
  assert.equal(
    parsed.message,
    "Gemini note failed (HTTP 404). The model may be unavailable for this key.",
  );
  assert.equal(parseGenerateResponse(500).message, "Gemini note failed (HTTP 500).");
  assert.match(parseGenerateResponse(401).message, /rejected/);

  const outcome = await generateNote(SAMPLE_KEY, "Prompt text", async () => ({
    status: 404,
    text: async () => {
      readBody = true;
      return JSON.stringify({ error: { message: leaked } });
    },
  }));
  assert.equal(outcome.result.ok, false);
  assert.equal(outcome.result.message, parsed.message);
  assert.equal(readBody, false);
  assert.equal(outcome.result.message.includes(SAMPLE_KEY), false);
  assert.equal(outcome.result.message.includes(leaked), false);
  assert.equal(outcome.result.message.includes("not found"), false);
});
