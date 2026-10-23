export const IDLE_MS = 60000;
export const MAX_TICK_GAP_MS = 5000;

export function scrollFraction(scrollY, scrollHeight, clientHeight) {
  const span = scrollHeight - clientHeight;
  if (span <= 0) return 1;
  const position = Number(scrollY);
  if (!Number.isFinite(position) || position <= 0) return 0;
  return Math.min(1, position / span);
}

export function isIdle(lastActivity, now, idleMs = IDLE_MS) {
  return now - lastActivity >= idleMs;
}

function clamp01(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return 0;
  if (number >= 1) return 1;
  return number;
}

export function reduceReading(state, event) {
  const url = typeof event.url === "string" ? event.url : "";
  const now = Number(event.now);
  const tick = Number.isFinite(now) ? now : 0;
  if (!state || state.url !== url) {
    return {
      url,
      elapsedMs: 0,
      maxScroll: clamp01(event.scrollDepth),
      lastTick: tick,
      sent: false,
      holdCode: "",
      holdUntil: 0,
      lastMessage: "",
    };
  }

  const gap = tick - state.lastTick;
  const running = event.visible === true && event.idle !== true;
  const delta = running && gap > 0 && gap <= MAX_TICK_GAP_MS ? gap : 0;
  return {
    url,
    elapsedMs: state.elapsedMs + delta,
    maxScroll: Math.max(state.maxScroll, clamp01(event.scrollDepth)),
    lastTick: tick,
    sent: state.sent === true,
    holdCode: state.holdCode || "",
    holdUntil: state.holdUntil || 0,
    lastMessage: state.lastMessage || "",
  };
}

export function meetsThreshold(state, rule) {
  if (!state || !rule) return false;
  return (
    state.elapsedMs >= rule.seconds * 1000 &&
    state.maxScroll + 1e-9 >= rule.scrollPercent / 100
  );
}

export function readingStorageKey(tabId) {
  return `reading:${tabId}`;
}
