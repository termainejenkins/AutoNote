export const STORAGE_KEY = "geminiApiKey";

export const GEMINI_ORIGIN = "https://generativelanguage.googleapis.com/*";

const GEMINI_TEST_URL =
  "https://generativelanguage.googleapis.com/v1beta/models?pageSize=1";

export function normalizeApiKey(value) {
  if (typeof value !== "string") {
    return "";
  }
  return value.replace(/\s+/g, "");
}

export function buildKeyTestRequest(apiKey) {
  const key = normalizeApiKey(apiKey);
  if (!key) {
    throw new Error("Enter a Gemini API key before testing.");
  }

  return {
    url: GEMINI_TEST_URL,
    init: {
      method: "GET",
      headers: {
        "x-goog-api-key": key,
      },
    },
  };
}

export function redactSecret(text, secret) {
  const source = text == null ? "" : String(text);
  const hidden = normalizeApiKey(secret);
  if (!hidden) {
    return source;
  }
  return source.split(hidden).join("[redacted]");
}

export function interpretKeyTestResponse(status) {
  if (status >= 200 && status < 300) {
    return {
      ok: true,
      message: "Key works. Gemini accepted a tiny test request.",
    };
  }
  if (status === 400 || status === 401 || status === 403) {
    return {
      ok: false,
      message: "Gemini rejected this key. Check the key and try again.",
    };
  }
  if (status === 429) {
    return {
      ok: false,
      message: "Gemini rate-limited the test. Wait a moment and try again.",
    };
  }
  return {
    ok: false,
    message: `Gemini test failed (HTTP ${status}).`,
  };
}

export async function sendKeyTest(apiKey, fetchImpl) {
  const request = buildKeyTestRequest(apiKey);
  const response = await fetchImpl(request.url, request.init);
  return {
    request,
    result: interpretKeyTestResponse(response.status),
  };
}
