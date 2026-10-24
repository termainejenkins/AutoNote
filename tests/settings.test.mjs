import assert from "node:assert/strict";
import { test } from "node:test";

import {
  DEFAULT_SETTINGS,
  isPaused,
  mergeSettings,
  normalizeSettings,
  ruleFor,
} from "../extension/settings.js";

test("auto notes and the send notice default off", () => {
  const settings = normalizeSettings(undefined);
  assert.equal(settings.autoEnabled, false);
  assert.equal(settings.sendConsent, false);
  assert.equal(settings.noteStyle, "study");
  assert.deepEqual(ruleFor(settings), {
    seconds: DEFAULT_SETTINGS.studySeconds,
    scrollPercent: DEFAULT_SETTINGS.studyScrollPercent,
  });
  assert.deepEqual(ruleFor({ noteStyle: "skim" }), {
    seconds: DEFAULT_SETTINGS.skimSeconds,
    scrollPercent: DEFAULT_SETTINGS.skimScrollPercent,
  });
});

test("settings clamp numbers and drop an api key field", () => {
  const settings = normalizeSettings({
    geminiApiKey: "unit-test-key",
    autoEnabled: true,
    studySeconds: 1,
    skimScrollPercent: 500,
  });
  assert.equal(Object.hasOwn(settings, "geminiApiKey"), false);
  assert.equal(JSON.stringify(settings).includes("unit-test-key"), false);
  assert.equal(settings.autoEnabled, true);
  assert.equal(settings.studySeconds, 10);
  assert.equal(settings.skimScrollPercent, 100);
});

test("merge keeps unrelated fields and pause is time based", () => {
  const merged = mergeSettings(DEFAULT_SETTINGS, { noteStyle: "skim", pausedUntil: 50 });
  assert.equal(merged.noteStyle, "skim");
  assert.equal(merged.studySeconds, DEFAULT_SETTINGS.studySeconds);
  assert.equal(isPaused(merged, 49), true);
  assert.equal(isPaused(merged, 50), false);
});
