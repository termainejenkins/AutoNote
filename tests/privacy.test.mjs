import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import {
  BUILTIN_BLOCK_RULES,
  addBlockPattern,
  domainListed,
  gatePage,
  isBuiltinPattern,
  normalizeAllowlist,
  normalizeBlocklist,
  patternMatches,
  removeBlockPattern,
} from "../extension/privacy.js";
import { mergeSettings, normalizeSettings } from "../extension/settings.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

test("domain and subdomain patterns match the host, not lookalikes", () => {
  assert.equal(patternMatches("https://example.com/guide", "example.com"), true);
  assert.equal(patternMatches("https://Example.com/guide", "Example.COM"), true);
  assert.equal(patternMatches("https://notes.example.com/post", "example.com"), true);
  assert.equal(patternMatches("https://a.b.example.com/post", "example.com"), true);
  assert.equal(patternMatches("https://notes.example.com/post", "notes.example.com"), true);
  assert.equal(patternMatches("https://a.notes.example.com/post", "notes.example.com"), true);
  assert.equal(patternMatches("https://example.com/post", "notes.example.com"), false);
  assert.equal(patternMatches("https://notexample.com/post", "example.com"), false);
  assert.equal(patternMatches("https://example.com.evil.test/post", "example.com"), false);
  assert.equal(domainListed("https://docs.example.com/a", ["example.com"]), true);
  assert.equal(domainListed("https://example.com/a", ["docs.example.com"]), false);
});

test("path patterns match a segment, a prefix, or a host plus a path", () => {
  assert.equal(patternMatches("https://shop.example.com/checkout", "/checkout"), true);
  assert.equal(patternMatches("https://shop.example.com/store/checkout/pay", "checkout"), true);
  assert.equal(patternMatches("https://shop.example.com/checkouthelp", "/checkout"), false);
  assert.equal(patternMatches("https://docs.example.com/course/module/notes", "/course/*/notes"), true);
  assert.equal(patternMatches("https://docs.example.com/course/notes", "/course/*/notes"), false);
  assert.equal(patternMatches("https://shop.example.com/private/doc", "shop.example.com/private"), true);
  assert.equal(patternMatches("https://shop.example.com/privateer", "shop.example.com/private"), false);
  assert.equal(patternMatches("https://other.example.com/private", "shop.example.com/private"), false);
  assert.equal(patternMatches("https://docs.example.com/Login", "/login"), true);
});

test("allowlist mode is off by default and limits both sends when on", () => {
  const open = "https://docs.example.com/guide";
  assert.equal(gatePage(open, normalizeSettings(undefined)).ok, true);
  assert.equal(gatePage(open, { allowlistEnabled: false, allowlist: ["example.org"] }).ok, true);
  assert.equal(gatePage(open, { allowlistEnabled: true, allowlist: ["example.com"] }).ok, true);
  assert.equal(gatePage("https://a.docs.example.com/guide", { allowlistEnabled: true, allowlist: ["docs.example.com"] }).ok, true);
  const blocked = gatePage(open, { allowlistEnabled: true, allowlist: ["example.org"] });
  assert.equal(blocked.ok, false);
  assert.equal(blocked.code, "allowlist");
  assert.match(blocked.message, /Only these sites is on/);
  const empty = gatePage(open, { allowlistEnabled: true, allowlist: [] });
  assert.equal(empty.ok, false);
  assert.match(empty.message, /no domains are listed/);
  assert.deepEqual(normalizeAllowlist(["https://Docs.Example.com/course", "/login"]), ["docs.example.com"]);
});

test("a block rule still wins when the allowlist includes that site", () => {
  const settings = {
    allowlistEnabled: true,
    allowlist: ["paypal.com", "docs.example.com"],
    blocklist: ["docs.example.com/private"],
  };
  assert.equal(gatePage("https://www.paypal.com/home", settings).ok, false);
  assert.match(gatePage("https://www.paypal.com/home", settings).message, /blocklist/);
  assert.match(gatePage("https://docs.example.com/private/1", settings).message, /your blocklist/);
  assert.equal(gatePage("https://docs.example.com/guide", settings).ok, true);
});

test("built-in rules stay active and cannot be added or removed", () => {
  assert.equal(isBuiltinPattern("paypal.com"), true);
  assert.equal(isBuiltinPattern("PayPal.com"), true);
  assert.equal(isBuiltinPattern("/login"), true);
  assert.equal(isBuiltinPattern("/account"), true);
  assert.equal(isBuiltinPattern("notes.example.com"), false);

  const added = addBlockPattern(["notes.example.com"], "mail.google.com");
  assert.equal(added.builtin, true);
  assert.equal(added.added, false);
  assert.deepEqual(added.list, ["notes.example.com"]);

  const removed = removeBlockPattern(["notes.example.com", "chase.com", "/cart"], "chase.com");
  assert.deepEqual(removed, ["notes.example.com"]);
  assert.deepEqual(removeBlockPattern(removed, "/login"), removed);
  assert.deepEqual(removeBlockPattern(removed, "notes.example.com"), []);

  const settings = normalizeSettings({ blocklist: ["paypal.com", "notes.example.com", "/checkout"] });
  assert.deepEqual(settings.blocklist, ["notes.example.com"]);
  assert.equal(gatePage("https://www.paypal.com/myaccount", settings).ok, false);
  assert.match(gatePage("https://mail.google.com/mail/u/0/", { blocklist: [] }).message, /blocklist/);
  assert.match(gatePage("https://www.irs.gov/payments", { blocklist: [] }).message, /Government/);
  assert.match(gatePage("https://www.service.gov.uk/tax", { blocklist: [] }).message, /Government/);
  assert.match(gatePage("https://shop.example.com/checkout", { blocklist: [] }).message, /Checkout/);
  assert.match(gatePage("https://docs.example.com/login", { blocklist: [] }).message, /login/);
  assert.match(gatePage("https://docs.example.com/account/settings", { blocklist: [] }).message, /account/i);
  assert.equal(gatePage("https://docs.example.com/signin", { blocklist: [] }).ok, false);

  const patterns = BUILTIN_BLOCK_RULES.map((rule) => rule.pattern);
  for (const pattern of ["mail.google.com", "paypal.com", "chase.com", ".gov", "/checkout", "/cart", "/login", "/account"]) {
    assert.equal(patterns.includes(pattern), true, pattern);
  }
  assert.equal(normalizeBlocklist(patterns).length, 0);
});

test("privacy defaults stay off and other settings keep the lists", () => {
  const settings = normalizeSettings({ geminiApiKey: "unit-test-key" });
  assert.equal(settings.allowlistEnabled, false);
  assert.equal(settings.autoEnabled, false);
  assert.equal(settings.sendConsent, false);
  assert.deepEqual(settings.blocklist, []);
  assert.deepEqual(settings.allowlist, []);
  assert.equal(JSON.stringify(settings).includes("unit-test-key"), false);

  const merged = mergeSettings(
    { blocklist: ["Notes.Example.com"], allowlistEnabled: true, allowlist: ["https://docs.example.com/a"] },
    { studySeconds: 50 },
  );
  assert.deepEqual(merged.blocklist, ["notes.example.com"]);
  assert.equal(merged.allowlistEnabled, true);
  assert.deepEqual(merged.allowlist, ["docs.example.com"]);
  assert.equal(merged.studySeconds, 50);
  assert.equal(merged.autoEnabled, false);
});

test("options page lists built-in rules, allowlist mode, and clear log", () => {
  const html = readFileSync(join(root, "extension", "options.html"), "utf8");
  assert.match(html, /id="builtin-rules"/);
  assert.match(html, /Built-in rules/);
  assert.match(html, /id="allowlist-enabled"/);
  assert.match(html, /Only take notes on these sites/);
  assert.match(html, /id="clear-log"/);
  assert.match(html, /Clear log/);
  assert.match(html, /id="send-log"/);
});
