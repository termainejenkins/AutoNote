import assert from "node:assert/strict";
import { test } from "node:test";

import {
  BADGE_COLOR,
  SESSION_COUNT_KEY,
  badgeTextForCount,
  badgeTitleForCount,
  incrementSessionCount,
  loadSessionCount,
  sessionBadgeUpdate,
  sessionCountFromStored,
} from "../extension/session-count.js";

const SAMPLE_KEY = "unit-test-key";
const PAGE_TEXT = "Page text that must not be stored with the session count.";

test("increment counts each successful note", () => {
  assert.equal(incrementSessionCount(0), 1);
  assert.equal(incrementSessionCount(1), 2);
  assert.equal(incrementSessionCount(2), 3);
  assert.equal(badgeTitleForCount(1), "AutoNote: 1 note this session");
  assert.equal(badgeTitleForCount(3), "AutoNote: 3 notes this session");
});

test("a new session with an empty store resets the counter", () => {
  const duringSession = incrementSessionCount(4);
  assert.equal(duringSession, 5);
  assert.equal(loadSessionCount({ [SESSION_COUNT_KEY]: duringSession }), 5);

  assert.equal(loadSessionCount(undefined), 0);
  assert.equal(loadSessionCount(null), 0);
  assert.equal(loadSessionCount({}), 0);
  assert.equal(sessionCountFromStored(undefined), 0);
  assert.equal(sessionCountFromStored(`${SAMPLE_KEY}`), 0);
  assert.equal(sessionCountFromStored({ url: "https://docs.example.com", text: PAGE_TEXT }), 0);
});

test("a stored count is what a restarted worker reads back", () => {
  const stored = { [SESSION_COUNT_KEY]: incrementSessionCount(2) };
  assert.deepEqual(stored, { [SESSION_COUNT_KEY]: 3 });
  assert.equal(loadSessionCount(stored), 3);
  assert.equal(JSON.stringify(stored).includes(SAMPLE_KEY), false);
  assert.equal(JSON.stringify(stored).includes(PAGE_TEXT), false);
});

test("0 clears the badge and a count sets text, green, and the title", () => {
  assert.equal(badgeTextForCount(0), "");
  assert.deepEqual(sessionBadgeUpdate(0), {
    text: "",
    color: BADGE_COLOR,
    title: "AutoNote: 0 notes this session",
  });
  assert.deepEqual(sessionBadgeUpdate(3), {
    text: "3",
    color: BADGE_COLOR,
    title: "AutoNote: 3 notes this session",
  });
  assert.equal(BADGE_COLOR, "#1b7f3a");
});

test("large counts format like 99+", () => {
  assert.equal(badgeTextForCount(99), "99");
  assert.equal(badgeTextForCount(100), "99+");
  assert.equal(badgeTextForCount(1000), "99+");
  assert.equal(badgeTitleForCount(100), "AutoNote: 100 notes this session");
  assert.equal(sessionBadgeUpdate(100).text, "99+");
});
