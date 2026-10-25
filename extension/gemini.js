export const STORAGE_KEY = "geminiApiKey";

export const GEMINI_ORIGIN = "https://generativelanguage.googleapis.com/*";

export const GEMINI_MODEL = "gemini-3.5-flash-lite";

const GEMINI_TEST_URL =
  "https://generativelanguage.googleapis.com/v1beta/models?pageSize=1";

const GEMINI_GENERATE_URL =
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

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

export function buildGenerateRequest(apiKey, prompt) {
  const key = normalizeApiKey(apiKey);
  if (!key) {
    throw new Error("Add a Gemini API key in options before generating a note.");
  }
  return {
    url: GEMINI_GENERATE_URL,
    init: {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": key,
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 2048,
          responseMimeType: "application/json",
        },
      }),
    },
  };
}

function candidateText(payload) {
  const parts = payload?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return "";
  return parts.map((part) => (typeof part?.text === "string" ? part.text : "")).join("");
}

export function parseModelJson(text) {
  const trimmed = String(text || "")
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
  if (!trimmed) return null;
  try {
    const value = JSON.parse(trimmed);
    if (value && typeof value === "object" && !Array.isArray(value)) return value;
  } catch {
    return null;
  }
  return null;
}

export function parseGenerateResponse(status) {
  if (status === 400 || status === 401 || status === 403) {
    return {
      ok: false,
      message: "Gemini rejected this key. Check the key in options.",
    };
  }
  if (status === 429) {
    return {
      ok: false,
      message: "Gemini rate-limited the note. Wait a moment and try again.",
    };
  }
  if (status === 404) {
    return {
      ok: false,
      message: "Gemini note failed (HTTP 404). The model may be unavailable for this key.",
    };
  }
  if (status < 200 || status >= 300) {
    return { ok: false, message: `Gemini note failed (HTTP ${status}).` };
  }
  return { ok: true, message: "" };
}

export function noteJsonFromBody(bodyText) {
  let payload;
  try {
    payload = JSON.parse(bodyText);
  } catch {
    return { ok: false, message: "Gemini returned a response AutoNote could not read." };
  }
  const json = parseModelJson(candidateText(payload));
  if (!json) {
    return { ok: false, message: "Gemini did not return note JSON." };
  }
  return { ok: true, json, message: "" };
}

export async function generateNote(apiKey, prompt, fetchImpl) {
  const request = buildGenerateRequest(apiKey, prompt);
  const response = await fetchImpl(request.url, request.init);
  const statusResult = parseGenerateResponse(response.status);
  if (!statusResult.ok) {
    return { request, result: statusResult };
  }
  const bodyText = typeof response.text === "function" ? await response.text() : "";
  const parsed = noteJsonFromBody(bodyText);
  return {
    request,
    result: parsed.ok ? { ok: true, json: parsed.json, message: "Note saved on this device." } : parsed,
  };
}
