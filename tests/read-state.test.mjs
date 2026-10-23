import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import {
  IDLE_MS,
  isIdle,
  meetsThreshold,
  reduceReading,
  scrollFraction,
} from "../extension/read-state.js";
import { DEFAULT_SETTINGS, ruleFor } from "../extension/settings.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const URL = "https://docs.example.com/course/module/overview";
const START = 1_700_000_000_000;

function advance(state, { seconds, visible = true, idle = false, scroll = 1, url = URL, start = START }) {
  let next = state;
  const origin = next ? next.lastTick : start;
  if (!next) {
    next = reduceReading(null, {
      url,
      now: origin,
      visible,
      idle,
      scrollDepth: scroll,
    });
  }
  for (let second = 1; second <= seconds; second += 1) {
    next = reduceReading(next, {
      url,
      now: origin + second * 1000,
      visible,
      idle,
      scrollDepth: scroll,
    });
  }
  return next;
}

test("scroll fraction treats a short page as fully read", () => {
  assert.equal(scrollFraction(0, 800, 800), 1);
  assert.equal(scrollFraction(250, 1000, 500), 0.5);
  assert.equal(scrollFraction(0, 2000, 500), 0);
});

test("visible time and scroll must both meet the Study default", () => {
  const rule = ruleFor(DEFAULT_SETTINGS);
  const reading = advance(null, { seconds: 44, scroll: 1 });
  assert.equal(meetsThreshold(reading, rule), false);
  const done = advance(null, { seconds: 45, scroll: 0.6 });
  assert.equal(meetsThreshold(done, rule), true);
  const shallow = advance(null, { seconds: 45, scroll: 0.59 });
  assert.equal(meetsThreshold(shallow, rule), false);
});

test("Skim defaults are lower than Study and still require both signals", () => {
  const skim = ruleFor({ ...DEFAULT_SETTINGS, noteStyle: "skim" });
  const early = advance(null, { seconds: 19, scroll: 0.4 });
  assert.equal(meetsThreshold(early, skim), false);
  const done = advance(null, { seconds: 20, scroll: 0.4 });
  assert.equal(meetsThreshold(done, skim), true);
  assert.equal(meetsThreshold(done, ruleFor(DEFAULT_SETTINGS)), false);
});

test("a hidden tab does not accumulate time", () => {
  let state = advance(null, { seconds: 10, scroll: 1 });
  const hiddenStart = state.lastTick;
  for (let second = 1; second <= 30; second += 1) {
    state = reduceReading(state, {
      url: URL,
      now: hiddenStart + second * 1000,
      visible: false,
      idle: false,
      scrollDepth: 1,
    });
  }
  assert.equal(state.elapsedMs, 10000);
  assert.equal(meetsThreshold(state, ruleFor(DEFAULT_SETTINGS)), false);
});

test("idle time does not accumulate and a one-second visit does not fire", () => {
  let state = advance(null, { seconds: 10, scroll: 1 });
  const idleStart = state.lastTick;
  for (let second = 1; second <= 40; second += 1) {
    state = reduceReading(state, {
      url: URL,
      now: idleStart + second * 1000,
      visible: true,
      idle: true,
      scrollDepth: 1,
    });
  }
  assert.equal(state.elapsedMs, 10000);
  const glance = advance(null, { seconds: 1, scroll: 0.1 });
  assert.equal(glance.elapsedMs, 1000);
  assert.equal(meetsThreshold(glance, ruleFor(DEFAULT_SETTINGS)), false);
  assert.equal(meetsThreshold(glance, ruleFor({ ...DEFAULT_SETTINGS, noteStyle: "skim" })), false);
});

test("a long gap does not count as reading, and a new URL starts over", () => {
  const state = advance(null, { seconds: 5, scroll: 0.2 });
  const jumped = reduceReading(state, {
    url: URL,
    now: state.lastTick + 60_000,
    visible: true,
    idle: false,
    scrollDepth: 0.9,
  });
  assert.equal(jumped.elapsedMs, state.elapsedMs);
  assert.equal(jumped.maxScroll, 0.9);
  const nextPage = reduceReading(jumped, {
    url: "https://docs.example.com/course/module/next",
    now: jumped.lastTick + 1000,
    visible: true,
    idle: false,
    scrollDepth: 1,
  });
  assert.equal(nextPage.elapsedMs, 0);
  assert.equal(nextPage.sent, false);
});

test("idle helper matches the content script constant", () => {
  assert.equal(isIdle(0, IDLE_MS - 1), false);
  assert.equal(isIdle(0, IDLE_MS), true);
  const content = readFileSync(join(root, "extension", "content.js"), "utf8");
  assert.match(content, new RegExp(`const IDLE_MS = ${IDLE_MS}`));
});
