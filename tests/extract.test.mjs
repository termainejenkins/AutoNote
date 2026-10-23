import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { TEXT_LIMIT, extractPage, skipReason } from "../extension/extract.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function fixture(name) {
  return readFileSync(join(root, "tests", "fixtures", name), "utf8");
}

const DOCS = "https://docs.example.com/course/module/overview";

test("article fixture keeps the article and drops nav, footer, and scripts", () => {
  const page = extractPage({ url: DOCS, html: fixture("article-docs.html") });
  assert.equal(page.status, "ok");
  assert.equal(page.title, "Module overview");
  assert.deepEqual(page.headings, ["Photosynthesis", "Light reactions"]);
  assert.match(page.text, /chemical energy stored in glucose/);
  assert.match(page.text, /thylakoid membrane/);
  assert.equal(page.text.includes("Navigation noise"), false);
  assert.equal(page.text.includes("Footer legal"), false);
  assert.equal(page.text.includes("SCRIPT_NOISE_MARKER"), false);
});

test("main fixture is used when the page has no article", () => {
  const page = extractPage({ url: DOCS, html: fixture("main-only.html") });
  assert.equal(page.status, "ok");
  assert.equal(page.title, "Skim page");
  assert.match(page.text, /cached record is stale/);
  assert.deepEqual(page.headings, ["Cache invalidation"]);
});

test("password fixture is skipped and its text is not returned", () => {
  const page = extractPage({ url: "https://example.com/welcome", html: fixture("password-page.html") });
  assert.equal(page.status, "skipped");
  assert.match(page.reason, /password field/);
  assert.equal(JSON.stringify(page).includes("must not be extracted"), false);
});

test("a chosen region is cleaned without looking for another article", () => {
  const page = extractPage({
    url: DOCS,
    title: "Given title",
    regionChosen: true,
    html: "<p>Hello from the region.</p><script>var SCRIPT_NOISE_MARKER = 1;</script>",
  });
  assert.equal(page.status, "ok");
  assert.equal(page.title, "Given title");
  assert.match(page.text, /Hello from the region/);
  assert.equal(page.text.includes("SCRIPT_NOISE_MARKER"), false);
});

test("long text is capped", () => {
  const html = `<article><p>${"abcd ".repeat(3000)}</p></article>`;
  const page = extractPage({ url: DOCS, html });
  assert.equal(page.status, "ok");
  assert.equal(page.truncated, true);
  assert.ok(page.text.length <= TEXT_LIMIT);
});

test("browser, blocklist, and sensitive URLs are skipped", () => {
  assert.match(skipReason({ url: "chrome://extensions/" }), /Browser pages/);
  assert.match(skipReason({ url: "https://mail.google.com/mail/u/0/" }), /blocklist/);
  assert.match(skipReason({ url: "https://www.irs.gov/payments" }), /Government/);
  assert.match(skipReason({ url: "https://shop.example.com/checkout" }), /Checkout/);
  assert.match(skipReason({ url: "https://docs.example.com/login" }), /login/);
  assert.equal(skipReason({ url: DOCS }), "");
});

test("snapshot collector prefers article, then main, then body", () => {
  const source = readFileSync(join(root, "extension", "snapshot.js"), "utf8");
  assert.match(source, /function autoNoteSnapshot/);
  assert.match(source, /querySelector\("article"\)/);
  assert.match(source, /querySelector\("main"\)/);
  assert.match(source, /querySelector\('input\[type="password"\]'\)/);
});
