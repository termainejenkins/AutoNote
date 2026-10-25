import fs from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";

import { SESSION_COUNT_KEY } from "../extension/session-count.js";

import {
  assertKeyOnlyInHeader,
  articleHtml,
  DUMMY_KEY,
  ExtensionPopup,
  installGeminiMock,
  launchExtension,
  readStorage,
  startArticleServer,
} from "./harness.mjs";

const PHOTO_PATH = "/guides/biology/photosynthesis";
const RESP_PATH = "/guides/biology/respiration";
const AUTO_PATH = "/guides/biology/membranes";
const LOGIN_PATH = "/login";

const PHOTO_SENTENCE = "Plants convert light into chemical energy stored in glucose.";
const RESP_SENTENCE = "Cells release energy from glucose during respiration in the mitochondria.";
const AUTO_SENTENCE = "Membranes keep ions on one side of the cell until a channel opens.";
const LOGIN_SENTENCE = "Secret login body should not be sent to Gemini.";

const shots = path.resolve("test-results/screenshots");

let session;
let server;
let calls;
let logs;
let photoUrl;
let respUrl;
let autoUrl;
let loginUrl;

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  fs.mkdirSync(shots, { recursive: true });
  server = await startArticleServer();
  server.page(PHOTO_PATH, articleHtml({
    title: "Photosynthesis module",
    heading: "Photosynthesis",
    sentence: PHOTO_SENTENCE,
  }));
  server.page(RESP_PATH, articleHtml({
    title: "Respiration module",
    heading: "Respiration",
    sentence: RESP_SENTENCE,
  }));
  server.page(AUTO_PATH, articleHtml({
    title: "Membrane module",
    heading: "Membranes",
    sentence: AUTO_SENTENCE,
    tall: true,
  }));
  server.page(LOGIN_PATH, articleHtml({
    title: "Sign in",
    heading: "Sign in",
    sentence: LOGIN_SENTENCE,
  }));
  photoUrl = server.url(PHOTO_PATH);
  respUrl = server.url(RESP_PATH);
  autoUrl = server.url(AUTO_PATH);
  loginUrl = server.url(LOGIN_PATH);

  session = await launchExtension();
  ({ calls, logs } = await installGeminiMock(session.context));
  await session.context.grantPermissions(["clipboard-read", "clipboard-write"]).catch(() => {});
});

test.afterAll(async () => {
  const artifacts = "/opt/cursor/artifacts";
  if (fs.existsSync(artifacts)) {
    for (const name of ["popup-generated-note.png", "notes-page.png"]) {
      const from = path.join(shots, name);
      if (fs.existsSync(from)) fs.copyFileSync(from, path.join(artifacts, name));
    }
  }
  await session?.close();
  await server?.close();
});

test.afterEach(() => {
  const leaked = logs.filter((line) => line.includes(DUMMY_KEY));
  expect(leaked).toEqual([]);
});

test("options notice, save key, and test key", async () => {
  const options = await openOptions();
  await options.locator("#send-consent").check();
  await expect(options.locator("#status")).toContainText("Notice confirmed");

  await options.locator("#gemini-key").fill(DUMMY_KEY);
  await options.locator("#save-key").click();
  await expect(options.locator("#status")).toContainText("Key saved in Chrome on this device");
  await expect(options.locator("#gemini-key")).toHaveValue("");
  await expect(options.locator("#saved-hint")).toContainText("A key is saved on this device");

  const stored = await readStorage(session.worker);
  expect(stored.geminiApiKey).toBe(DUMMY_KEY);

  await options.locator("#test-key").click();
  await expect(options.locator("#status")).toContainText("Key works. Gemini accepted a tiny test request.");

  expect(calls).toHaveLength(1);
  const testCall = calls[0];
  expect(testCall.method).toBe("GET");
  expect(testCall.url).toContain("/v1beta/models?pageSize=1");
  expect(testCall.body).toBe("");
  expect(testCall.body.includes(PHOTO_SENTENCE)).toBe(false);
  assertKeyOnlyInHeader(testCall, DUMMY_KEY);
  await options.close();
});

test("popup shows the article title and character count", async () => {
  const article = await session.context.newPage();
  await article.goto(photoUrl);
  await article.bringToFront();
  const popup = await ExtensionPopup.open(session.context, session.worker);
  const title = await popup.text("#page-title");
  const status = await popup.text("#page-status");
  expect(title.trim()).toBe("Photosynthesis module");
  const count = Number(status.match(/(\d+) characters/)?.[1]);
  expect(count).toBeGreaterThan(PHOTO_SENTENCE.length);
  expect(count).toBeLessThanOrEqual(12000);
  expect(status).toContain(`${count} characters`);
  expect(calls.filter((call) => call.method === "POST")).toHaveLength(0);
  const badge = await sessionBadge();
  expect(badge.text).toBe("");
  expect(badge.count).toBe(0);
  expect(badge.title).toBe("AutoNote: 0 notes this session");
  await popup.close();
  await article.close();
});

test("generates a Study note and stores it on this device", async () => {
  const article = await session.context.newPage();
  await article.goto(photoUrl);
  await article.bringToFront();
  const popup = await ExtensionPopup.open(session.context, session.worker);
  await popup.selectStyle("study");
  await popup.click("#generate");
  const status = await popup.waitForText("#status", /Note saved|Could not|rejected|unexpected|confirm the notice|Add a Gemini|can't be read|skipped/i);
  expect(status).toBe("Note saved on this device.");

  const post = calls.filter((call) => call.method === "POST");
  expect(post).toHaveLength(1);
  expect(post[0].url).toContain(":generateContent");
  expect(post[0].body).toContain(PHOTO_SENTENCE);
  expect(post[0].body).toContain("Mode: study");
  assertKeyOnlyInHeader(post[0], DUMMY_KEY);

  const notes = (await readStorage(session.worker)).autonoteNotes;
  expect(notes).toHaveLength(1);
  expect(notes[0].mode).toBe("study");
  expect(notes[0].title).toBe("Photosynthesis module");
  expect(notes[0].url).toBe(photoUrl);
  expect(notes[0].topicKey).toBe("127.0.0.1/guides/biology");
  expect(notes[0].markdown).toContain("Plants store light as chemical energy in glucose.");
  expect(notes[0].markdown).toContain("Chlorophyll");
  const badge = await sessionBadge();
  expect(badge.text).toBe("1");
  expect(badge.title).toBe("AutoNote: 1 note this session");
  expect(badge.count).toBe(1);
  expect(JSON.stringify(badge.stored).includes(DUMMY_KEY)).toBe(false);

  await popup.screenshot(path.join(shots, "popup-generated-note.png"));
  await popup.close();
  await article.close();
});

test("generates a Skim note for another page in the same topic", async () => {
  const article = await session.context.newPage();
  await article.goto(respUrl);
  await article.bringToFront();
  const popup = await ExtensionPopup.open(session.context, session.worker);
  expect((await popup.text("#page-title")).trim()).toBe("Respiration module");
  await popup.selectStyle("skim");
  await popup.click("#generate");
  const status = await popup.waitForText("#status", /Note saved|Could not|rejected|unexpected|skipped/i);
  expect(status).toBe("Note saved on this device.");

  const skimCall = calls.filter((call) => call.body.includes("Mode: skim"));
  expect(skimCall).toHaveLength(1);
  expect(skimCall[0].body).toContain(RESP_SENTENCE);
  assertKeyOnlyInHeader(skimCall[0], DUMMY_KEY);

  const notes = (await readStorage(session.worker)).autonoteNotes;
  expect(notes).toHaveLength(2);
  expect(notes.map((note) => note.mode).sort()).toEqual(["skim", "study"]);
  expect(notes.every((note) => note.topicKey === "127.0.0.1/guides/biology")).toBe(true);
  const skim = notes.find((note) => note.mode === "skim");
  expect(skim.markdown).toContain("Respiration releases the energy stored in glucose.");
  expect(skim.url).toBe(respUrl);
  await popup.close();
  await article.close();
});

test("notes page groups the topic and markdown copy and download include the heading and source", async () => {
  const notes = await session.context.newPage();
  await notes.goto(`chrome-extension://${session.extensionId}/notes.html`);
  await expect(notes.getByRole("heading", { level: 2, name: "guides / biology" })).toBeVisible();
  await expect(notes.getByRole("heading", { level: 3, name: "Photosynthesis module" })).toBeVisible();
  await expect(notes.getByRole("heading", { level: 3, name: "Respiration module" })).toBeVisible();
  await expect(notes.getByRole("link", { name: photoUrl })).toBeVisible();
  await expect(notes.getByRole("link", { name: respUrl })).toBeVisible();
  await notes.screenshot({ path: path.join(shots, "notes-page.png"), fullPage: true });

  await notes.getByRole("button", { name: "Copy topic as Markdown" }).click();
  await expect(notes.locator("#status")).toHaveText("Topic Markdown copied.");
  const copied = await notes.evaluate(async () => navigator.clipboard.readText());
  expectMarkdown(copied);

  const [download] = await Promise.all([
    notes.waitForEvent("download"),
    notes.getByRole("button", { name: "Download topic" }).click(),
  ]);
  expect(download.suggestedFilename()).toBe("guides-biology.md");
  const file = path.join(shots, "guides-biology.md");
  await download.saveAs(file);
  expectMarkdown(fs.readFileSync(file, "utf8"));
  await notes.close();
});

test("delete note removes it from this device", async () => {
  const notes = await session.context.newPage();
  await notes.goto(`chrome-extension://${session.extensionId}/notes.html`);
  const articles = notes.locator("article");
  await expect(articles).toHaveCount(2);
  notes.once("dialog", async (dialog) => {
    await dialog.accept();
  });
  await articles.filter({ hasText: "Photosynthesis module" }).getByRole("button", { name: "Delete note" }).click();
  await expect(notes.locator("#status")).toHaveText("Note deleted from this device.");
  await expect(notes.getByRole("heading", { level: 3, name: "Photosynthesis module" })).toHaveCount(0);
  await expect(notes.getByRole("heading", { level: 3, name: "Respiration module" })).toBeVisible();

  const stored = (await readStorage(session.worker)).autonoteNotes;
  expect(stored).toHaveLength(1);
  expect(stored[0].url).toBe(respUrl);
  await notes.close();
});

test("a blocklisted login URL sends nothing", async () => {
  const before = calls.length;
  const article = await session.context.newPage();
  await article.goto(loginUrl);
  await article.bringToFront();
  const popup = await ExtensionPopup.open(session.context, session.worker);
  const pageStatus = await popup.text("#page-status");
  expect(pageStatus).toContain("login");
  expect(pageStatus.toLowerCase()).toContain("skipped");
  await popup.click("#generate");
  const status = await popup.waitForText("#status", /skipped|login/i);
  expect(status.toLowerCase()).toMatch(/login|skipped/);
  expect(calls).toHaveLength(before);
  expect(calls.some((call) => call.body.includes(LOGIN_SENTENCE))).toBe(false);
  await popup.close();
  await article.close();
});

test("auto mode saves one note for a URL per day", async () => {
  const options = await openOptions();
  await options.locator("#note-style").selectOption("study");
  await options.locator("#study-seconds").fill("10");
  await options.locator("#study-scroll").fill("10");
  await options.locator("#auto-enabled").check();
  await options.locator("#save-reading").click();
  await expect(options.locator("#status")).toContainText("Auto notes are on");
  await options.close();

  const before = calls.length;
  const article = await session.context.newPage();
  await article.goto(autoUrl);
  await article.bringToFront();
  await article.mouse.move(220, 240);
  await article.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

  await expect.poll(async () => {
    const all = await session.worker.evaluate(async () => chrome.storage.session.get(null));
    return Object.values(all).some((state) => state?.url === autoUrl);
  }, { timeout: 8_000 }).toBe(true);

  await expect.poll(() => calls.filter((call) => call.body.includes(AUTO_SENTENCE)).length, {
    timeout: 25_000,
  }).toBe(1);

  const autoCall = calls.find((call) => call.body.includes(AUTO_SENTENCE));
  expect(autoCall.method).toBe("POST");
  expect(autoCall.body).toContain("Mode: study");
  assertKeyOnlyInHeader(autoCall, DUMMY_KEY);
  expect(calls.length).toBe(before + 1);

  const saved = (await readStorage(session.worker)).autonoteNotes.filter((note) => note.url === autoUrl);
  expect(saved).toHaveLength(1);
  const badge = await sessionBadge();
  expect(badge.text).toBe("3");
  expect(badge.title).toBe("AutoNote: 3 notes this session");
  expect(badge.count).toBe(3);

  await article.goto(loginUrl);
  await article.goto(autoUrl);
  await article.bringToFront();
  await article.mouse.move(180, 200);
  await article.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect.poll(async () => {
    const state = await readingState(autoUrl);
    return Boolean(state && state.sent === false && state.elapsedMs < 8000);
  }, { timeout: 10_000 }).toBe(true);
  await expect.poll(async () => {
    const state = await readingState(autoUrl);
    return Boolean(state?.sent && state.elapsedMs >= 10_000);
  }, { timeout: 25_000 }).toBe(true);
  expect(calls.filter((call) => call.body.includes(AUTO_SENTENCE))).toHaveLength(1);
  const still = (await readStorage(session.worker)).autonoteNotes.filter((note) => note.url === autoUrl);
  expect(still).toHaveLength(1);
  await article.close();
});

test("remove key clears the saved key", async () => {
  const options = await openOptions();
  await expect(options.locator("#saved-hint")).toContainText("A key is already saved");
  await options.locator("#clear-key").click();
  await expect(options.locator("#status")).toHaveText("Saved key removed from this device.");
  await expect(options.locator("#saved-hint")).toHaveText("No key is saved yet.");
  await expect(options.locator("#gemini-key")).toHaveValue("");
  const stored = await readStorage(session.worker);
  expect(stored.geminiApiKey).toBeUndefined();
  const notes = stored.autonoteNotes;
  expect(notes.length).toBeGreaterThan(0);
  await options.close();
});

function expectMarkdown(markdown) {
  expect(markdown.startsWith("# guides / biology\n")).toBe(true);
  expect(markdown).toContain("## Photosynthesis module");
  expect(markdown).toContain(`[Source](${photoUrl})`);
  expect(markdown).toContain("## Respiration module");
  expect(markdown).toContain(`[Source](${respUrl})`);
  expect(markdown.includes(DUMMY_KEY)).toBe(false);
}

async function openOptions() {
  const page = await session.context.newPage();
  await page.goto(`chrome-extension://${session.extensionId}/options.html`);
  await page.locator("#gemini-key").waitFor();
  return page;
}

async function sessionBadge() {
  return session.worker.evaluate(async (key) => {
    const stored = await chrome.storage.session.get(key);
    return {
      text: await chrome.action.getBadgeText({}),
      title: await chrome.action.getTitle({}),
      count: typeof stored[key] === "number" ? stored[key] : 0,
      stored,
    };
  }, SESSION_COUNT_KEY);
}

async function readingState(url) {
  const all = await session.worker.evaluate(async () => chrome.storage.session.get(null));
  return Object.values(all).find((item) => item?.url === url) || null;
}
