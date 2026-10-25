import { chromium } from "@playwright/test";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";

const OPTIONAL_HOSTS = [
  "https://generativelanguage.googleapis.com/*",
  "https://*/*",
  "http://*/*",
];

const STUDY_NOTE = {
  summary: "Plants store light as chemical energy in glucose.",
  keyTerms: [
    { term: "Chlorophyll", meaning: "Pigment that absorbs blue and red light." },
    { term: "Thylakoid", meaning: "Membrane where the light reactions run." },
    { term: "Glucose", meaning: "Sugar that stores the captured energy." },
  ],
  questions: [
    "Where do the light reactions occur?",
    "What molecule stores the captured energy?",
    "Which wavelengths does chlorophyll absorb?",
  ],
};

const SKIM_NOTE = {
  summary: "Respiration releases the energy stored in glucose. Mitochondria run most of that release. The skim stops at those two facts.",
  takeaways: [
    "Glucose is the fuel.",
    "Mitochondria do most of the work.",
    "The note stays short on purpose.",
  ],
};

export const DUMMY_KEY = "test-key-not-real";

export function articleHtml({ title, heading, sentence, tall = false }) {
  const spacer = tall ? '<div style="height:4200px">Spacer so the page can scroll.</div>' : "";
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${title}</title>
  </head>
  <body>
    <nav><p>Navigation that should stay out of the note.</p></nav>
    <article>
      <h1>${heading}</h1>
      <p>${sentence}</p>
      ${spacer}
    </article>
    <footer><p>Footer that should stay out of the note.</p></footer>
  </body>
</html>`;
}

export function startArticleServer() {
  const pages = new Map();
  const server = http.createServer((request, response) => {
    const pathname = new URL(request.url, "http://127.0.0.1").pathname;
    const body = pages.get(pathname);
    if (!body) {
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }
    response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    response.end(body);
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      const origin = `http://127.0.0.1:${port}`;
      resolve({
        origin,
        url(pathname) {
          return `${origin}${pathname}`;
        },
        page(pathname, html) {
          pages.set(pathname, html);
        },
        close() {
          return new Promise((done) => server.close(() => done()));
        },
      });
    });
  });
}

function launchOptions(extensionPath, userDataDir) {
  return {
    headless: false,
    viewport: { width: 1100, height: 900 },
    colorScheme: "light",
    acceptDownloads: true,
    ignoreDefaultArgs: ["--disable-extensions"],
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
    ],
    userDataDir,
  };
}

async function openContext(userDataDir, extensionPath) {
  const { userDataDir: _ignored, ...options } = launchOptions(extensionPath, userDataDir);
  const context = await chromium.launchPersistentContext(userDataDir, options);
  let worker = context.serviceWorkers()[0];
  if (!worker) worker = await context.waitForEvent("serviceworker", { timeout: 20_000 });
  const extensionId = new URL(worker.url()).host;
  return { context, worker, extensionId };
}

function grantOptionalHosts(userDataDir, extensionId) {
  const prefsPath = path.join(userDataDir, "Default", "Preferences");
  const prefs = JSON.parse(fs.readFileSync(prefsPath, "utf8"));
  const settings = prefs.extensions?.settings?.[extensionId];
  if (!settings) {
    throw new Error(`Extension ${extensionId} was not recorded in the Chrome profile.`);
  }
  for (const key of ["granted_permissions", "active_permissions"]) {
    settings[key].explicit_host = [...OPTIONAL_HOSTS];
  }
  fs.writeFileSync(prefsPath, JSON.stringify(prefs));
}

export async function launchExtension() {
  const extensionPath = path.resolve("extension");
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "autonote-e2e-"));
  const first = await openContext(userDataDir, extensionPath);
  const extensionId = first.extensionId;
  await first.context.close();
  for (const name of ["SingletonLock", "SingletonCookie", "SingletonSocket"]) {
    fs.rmSync(path.join(userDataDir, name), { force: true });
  }
  // Playwright's DevTools pipe never shows the optional-host permission bubble,
  // and chrome.permissions.request then never settles. Grant the same origins
  // the options page asks for so that call returns true during a click.
  grantOptionalHosts(userDataDir, extensionId);
  const second = await openContext(userDataDir, extensionPath);
  return {
    context: second.context,
    worker: second.worker,
    extensionId,
    userDataDir,
    async close() {
      await second.context.close();
      fs.rmSync(userDataDir, { recursive: true, force: true });
    },
  };
}

export function installGeminiMock(context) {
  const calls = [];
  const logs = [];
  const watch = (target) => {
    target.on("console", (message) => {
      logs.push(message.text());
    });
  };
  context.on("page", watch);
  context.on("serviceworker", watch);
  for (const page of context.pages()) watch(page);
  for (const worker of context.serviceWorkers()) watch(worker);

  const installed = context.route(/https:\/\/generativelanguage\.googleapis\.com\/.*/, async (route) => {
    const request = route.request();
    const body = request.postData() || "";
    calls.push({
      url: request.url(),
      method: request.method(),
      headers: request.headers(),
      body,
    });
    const skim = body.includes("Mode: skim");
    const payload = skim ? SKIM_NOTE : STUDY_NOTE;
    const listed = !request.url().includes(":generateContent");
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        listed
          ? {
              models: [
                {
                  name: "models/gemini-3.5-flash-lite",
                  version: "001",
                  displayName: "Gemini 3.5 Flash-Lite",
                  description: "Lightweight model for short notes.",
                  inputTokenLimit: 1048576,
                  outputTokenLimit: 8192,
                  supportedGenerationMethods: ["generateContent", "countTokens"],
                },
              ],
            }
          : {
              candidates: [
                {
                  content: {
                    role: "model",
                    parts: [{ text: JSON.stringify(payload) }],
                  },
                  finishReason: "STOP",
                  index: 0,
                },
              ],
              usageMetadata: {
                promptTokenCount: 128,
                candidatesTokenCount: 96,
                totalTokenCount: 224,
              },
              modelVersion: "gemini-3.5-flash-lite",
            },
      ),
    });
  });
  return installed.then(() => ({ calls, logs }));
}

export function assertKeyOnlyInHeader(call, key) {
  const url = new URL(call.url);
  if (url.searchParams.has("key") || call.url.includes(key)) {
    throw new Error("Gemini key appeared in the request URL.");
  }
  if (call.body.includes(key)) {
    throw new Error("Gemini key appeared in the request body.");
  }
  if (call.headers["x-goog-api-key"] !== key) {
    throw new Error("Gemini key was missing from the x-goog-api-key header.");
  }
}

export class ExtensionPopup {
  constructor(cdp, sessionId, targetId) {
    this.cdp = cdp;
    this.sessionId = sessionId;
    this.targetId = targetId;
    this.nextId = 0;
    this.pending = new Map();
    this.cdp.on("Target.receivedMessageFromTarget", (event) => {
      if (event.sessionId !== this.sessionId) return;
      let payload;
      try {
        payload = JSON.parse(event.message);
      } catch {
        return;
      }
      const resolve = this.pending.get(payload.id);
      if (!resolve) return;
      this.pending.delete(payload.id);
      resolve(payload);
    });
  }

  static async open(context, worker) {
    const cdp = await context.browser().newBrowserCDPSession();
    const existing = await cdp.send("Target.getTargets");
    for (const target of existing.targetInfos) {
      if (target.url.includes("/popup.html")) {
        await cdp.send("Target.closeTarget", { targetId: target.targetId }).catch(() => {});
      }
    }
    await worker.evaluate(async () => {
      await chrome.action.openPopup();
    });
    const started = Date.now();
    let target;
    while (Date.now() - started < 8000) {
      const { targetInfos } = await cdp.send("Target.getTargets");
      target = targetInfos.find((item) => item.type === "page" && item.url.includes("/popup.html"));
      if (target) break;
      await sleep(100);
    }
    if (!target) throw new Error("The toolbar popup did not open.");
    const attached = await cdp.send("Target.attachToTarget", {
      targetId: target.targetId,
      flatten: false,
    });
    const popup = new ExtensionPopup(cdp, attached.sessionId, target.targetId);
    await popup.waitForText("#page-title", /^(?!Checking this page)/, 8000);
    return popup;
  }

  async send(method, params) {
    const id = ++this.nextId;
    const response = new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`CDP ${method} timed out`));
      }, 10000);
      this.pending.set(id, (payload) => {
        clearTimeout(timer);
        if (payload.error) reject(new Error(payload.error.message || JSON.stringify(payload.error)));
        else resolve(payload.result);
      });
    });
    await this.cdp.send("Target.sendMessageToTarget", {
      sessionId: this.sessionId,
      message: JSON.stringify({ id, method, params }),
    });
    return response;
  }

  async evaluate(expression) {
    const result = await this.send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (result.exceptionDetails) {
      const text = result.exceptionDetails.text || "Popup script failed";
      const description = result.exceptionDetails.exception?.description || "";
      throw new Error(`${text} ${description}`.trim());
    }
    return result.result?.value;
  }

  async text(selector) {
    return this.evaluate(`document.querySelector(${JSON.stringify(selector)})?.textContent ?? ""`);
  }

  async click(selector) {
    const clicked = await this.evaluate(`(() => {
      const element = document.querySelector(${JSON.stringify(selector)});
      if (!element) return false;
      element.click();
      return true;
    })()`);
    if (!clicked) throw new Error(`No popup element matches ${selector}`);
  }

  async selectStyle(mode) {
    await this.evaluate(`(() => {
      const select = document.querySelector("#note-style");
      select.value = ${JSON.stringify(mode)};
      select.dispatchEvent(new Event("change", { bubbles: true }));
    })()`);
  }

  async waitForText(selector, pattern, timeout = 15000) {
    const started = Date.now();
    let latest = "";
    while (Date.now() - started < timeout) {
      latest = await this.text(selector);
      if (pattern.test(latest)) return latest;
      await sleep(150);
    }
    throw new Error(`Timed out waiting for ${selector} to match ${pattern}. Last text: ${latest}`);
  }

  async screenshot(file) {
    await this.send("Page.enable").catch(() => {});
    const shot = await this.send("Page.captureScreenshot", { format: "png" });
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, Buffer.from(shot.data, "base64"));
    return file;
  }

  async close() {
    await this.cdp.send("Target.closeTarget", { targetId: this.targetId }).catch(() => {});
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function readStorage(worker) {
  return worker.evaluate(async () => chrome.storage.local.get(null));
}
