import { redactSecret } from "./gemini.js";

export const SEND_LOG_KEY = "autonoteSendLog";

export const SEND_LOG_LIMIT = 200;

const TEXT_SCRUB_MIN = 24;

const ENTRY_FIELDS = ["time", "url", "title", "mode", "characters", "ok", "error"];

function cleanTime(value) {
  if (typeof value === "string" && !Number.isNaN(Date.parse(value))) {
    return new Date(value).toISOString();
  }
  return new Date().toISOString();
}

function clampCount(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return 0;
  return Math.min(1000000, Math.round(number));
}

function pageText(source) {
  const chunks = [source.text, source.pageText, source.prompt, source.body];
  return chunks.find((chunk) => typeof chunk === "string" && chunk.length >= TEXT_SCRUB_MIN) || "";
}

function secretFrom(source) {
  if (typeof source.apiKey === "string" && source.apiKey.trim()) return source.apiKey;
  if (typeof source.key === "string" && source.key.trim()) return source.key;
  if (typeof source.secret === "string") return source.secret;
  return "";
}

function scrub(value, secret, text, max) {
  let output = redactSecret(value == null ? "" : String(value), secret);
  if (text) output = output.split(text).join("[redacted]");
  if (output.length > max) output = output.slice(0, max);
  return output;
}

function normalizeMode(source) {
  const token = String(source.mode || source.kind || "").trim().toLowerCase();
  if (source.kind === "key-test" || token === "key-test" || token === "key test") return "key-test";
  if (token === "skim") return "skim";
  return "study";
}

export function createSendLogEntry(input) {
  const source = input && typeof input === "object" ? input : {};
  const mode = normalizeMode(source);
  const secret = secretFrom(source);
  const text = pageText(source);
  const keyTest = mode === "key-test";
  const entry = {
    time: cleanTime(source.time),
    url: keyTest ? "" : scrub(source.url, secret, text, 2000),
    title: keyTest ? "" : scrub(source.title, secret, text, 300),
    mode,
    characters: keyTest ? 0 : clampCount(source.characters),
    ok: source.ok === true,
    error: source.ok === true ? "" : scrub(source.error || source.message || "", secret, text, 300),
  };
  return ENTRY_FIELDS.reduce((copy, field) => {
    copy[field] = entry[field];
    return copy;
  }, {});
}

export function sanitizeSendLog(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, SEND_LOG_LIMIT).map((entry) => createSendLogEntry(entry));
}

export function appendSendLog(log, entry) {
  const previous = sanitizeSendLog(log);
  return [createSendLogEntry(entry), ...previous].slice(0, SEND_LOG_LIMIT);
}

export function modeLabel(mode) {
  if (mode === "key-test") return "Key test";
  if (mode === "skim") return "Skim";
  return "Study";
}
