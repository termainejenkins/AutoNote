import assert from "node:assert/strict";
import { test } from "node:test";

import { GEMINI_ORIGIN, STORAGE_KEY } from "../extension/gemini.js";

function element() {
  return {
    value: "",
    textContent: "",
    disabled: false,
    listeners: {},
    addEventListener(type, handler) {
      this.listeners[type] = handler;
    },
  };
}

test("options page does not contact Gemini until Test key is clicked", async () => {
  const elements = new Map();
  const storage = new Map();
  const permissionCalls = [];
  const fetchCalls = [];
  let allowNetwork = true;

  globalThis.document = {
    getElementById(id) {
      if (!elements.has(id)) {
        elements.set(id, element());
      }
      return elements.get(id);
    },
  };
  globalThis.chrome = {
    storage: {
      local: {
        async get(key) {
          return { [key]: storage.get(key) };
        },
        async set(values) {
          for (const [key, value] of Object.entries(values)) {
            storage.set(key, value);
          }
        },
        async remove(key) {
          storage.delete(key);
        },
      },
    },
    permissions: {
      async request(request) {
        permissionCalls.push(request);
        return allowNetwork;
      },
    },
  };
  globalThis.fetch = async () => {
    throw new Error("Gemini was contacted before the test arranged a click");
  };

  await import("../extension/options.js");
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(permissionCalls.length, 0);
  assert.equal(fetchCalls.length, 0);
  assert.equal(elements.get("saved-hint").textContent, "No key is saved yet.");

  globalThis.fetch = async (url, init) => {
    fetchCalls.push({ url, init });
    return { status: 200 };
  };

  await elements.get("test-key").listeners.click();
  assert.equal(fetchCalls.length, 0);
  assert.equal(permissionCalls.length, 0);
  assert.match(elements.get("status").textContent, /Enter a Gemini API key/);

  elements.get("gemini-key").value = "unit-test-key";
  allowNetwork = false;
  await elements.get("test-key").listeners.click();
  assert.deepEqual(permissionCalls, [{ origins: [GEMINI_ORIGIN] }]);
  assert.equal(fetchCalls.length, 0);
  assert.match(elements.get("status").textContent, /not granted/);
  assert.equal(elements.get("status").textContent.includes("unit-test-key"), false);

  allowNetwork = true;
  await elements.get("test-key").listeners.click();
  assert.equal(fetchCalls.length, 1);
  assert.equal(fetchCalls[0].url.includes("unit-test-key"), false);
  assert.equal(fetchCalls[0].init.headers["x-goog-api-key"], "unit-test-key");
  assert.match(elements.get("status").textContent, /Key works/);
  assert.equal(elements.get("status").textContent.includes("unit-test-key"), false);
  assert.equal(elements.get("test-key").disabled, false);

  await elements.get("key-form").listeners.submit({
    preventDefault() {},
  });
  assert.equal(storage.get(STORAGE_KEY), "unit-test-key");
  assert.equal(elements.get("gemini-key").value, "");
  assert.equal(elements.get("status").textContent.includes("unit-test-key"), false);

  elements.get("gemini-key").value = "";
  fetchCalls.length = 0;
  await elements.get("test-key").listeners.click();
  assert.equal(fetchCalls.length, 1);
  assert.equal(fetchCalls[0].init.headers["x-goog-api-key"], "unit-test-key");

  await elements.get("clear-key").listeners.click();
  assert.equal(storage.has(STORAGE_KEY), false);
  assert.match(elements.get("status").textContent, /removed/);
});
