import assert from "node:assert/strict";
import { test } from "node:test";

import { decideSend } from "../extension/decide.js";

const extraction = {
  status: "ok",
  url: "https://docs.example.com/course/module/a",
  title: "A",
  headings: [],
  text: "Readable text.",
};

function decide(overrides) {
  return decideSend({
    manual: false,
    consent: true,
    hasKey: true,
    autoEnabled: true,
    paused: false,
    alreadyToday: false,
    extraction,
    ...overrides,
  });
}

test("page text is not sent until the notice is confirmed", () => {
  assert.equal(decide({ manual: true, consent: false }).code, "consent");
  assert.equal(decide({ consent: false }).code, "consent");
});

test("manual generate works while auto notes stay off", () => {
  const manual = decide({ manual: true, autoEnabled: false, paused: true, alreadyToday: true });
  assert.equal(manual.ok, true);
  assert.equal(decide({ manual: false, autoEnabled: false }).code, "auto-off");
});

test("auto send stops for pause, duplicates, a missing key, and skipped pages", () => {
  assert.equal(decide({ paused: true }).code, "paused");
  assert.equal(decide({ alreadyToday: true }).code, "duplicate");
  assert.equal(decide({ hasKey: false }).code, "key");
  assert.equal(decide({ extraction: { status: "skipped", reason: "Pages with a password field are skipped." } }).code, "skipped");
});
