import { normalizeAllowlist, normalizeBlocklist } from "./privacy.js";

export const SETTINGS_KEY = "autonoteSettings";

export const DEFAULT_SETTINGS = {
  autoEnabled: false,
  noteStyle: "study",
  sendConsent: false,
  pausedUntil: 0,
  studySeconds: 45,
  studyScrollPercent: 60,
  skimSeconds: 20,
  skimScrollPercent: 40,
  blocklist: [],
  allowlistEnabled: false,
  allowlist: [],
};

function clampInt(value, fallback, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.round(number)));
}

export function normalizeSettings(value) {
  const source = value && typeof value === "object" ? value : {};
  const pausedUntil = Number(source.pausedUntil);
  return {
    autoEnabled: source.autoEnabled === true,
    noteStyle: source.noteStyle === "skim" ? "skim" : "study",
    sendConsent: source.sendConsent === true,
    pausedUntil: Number.isFinite(pausedUntil) && pausedUntil > 0 ? pausedUntil : 0,
    studySeconds: clampInt(source.studySeconds, DEFAULT_SETTINGS.studySeconds, 10, 600),
    studyScrollPercent: clampInt(
      source.studyScrollPercent,
      DEFAULT_SETTINGS.studyScrollPercent,
      10,
      100,
    ),
    skimSeconds: clampInt(source.skimSeconds, DEFAULT_SETTINGS.skimSeconds, 5, 600),
    skimScrollPercent: clampInt(
      source.skimScrollPercent,
      DEFAULT_SETTINGS.skimScrollPercent,
      10,
      100,
    ),
    blocklist: normalizeBlocklist(source.blocklist),
    allowlistEnabled: source.allowlistEnabled === true,
    allowlist: normalizeAllowlist(source.allowlist),
  };
}

export function mergeSettings(current, patch) {
  return normalizeSettings({ ...normalizeSettings(current), ...patch });
}

export function ruleFor(settings) {
  const safe = normalizeSettings(settings);
  if (safe.noteStyle === "skim") {
    return { seconds: safe.skimSeconds, scrollPercent: safe.skimScrollPercent };
  }
  return { seconds: safe.studySeconds, scrollPercent: safe.studyScrollPercent };
}

export function isPaused(settings, now) {
  return normalizeSettings(settings).pausedUntil > now;
}
