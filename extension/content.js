const IDLE_MS = 60000;
let lastActivity = Date.now();

function markActivity() {
  lastActivity = Date.now();
}

window.addEventListener("mousemove", markActivity, { passive: true });
window.addEventListener("keydown", markActivity, { passive: true });
window.addEventListener("scroll", markActivity, { passive: true });
window.addEventListener("pointerdown", markActivity, { passive: true });

function currentScroll() {
  const root = document.documentElement;
  const span = root.scrollHeight - root.clientHeight;
  if (span <= 0) return 1;
  const position = window.scrollY;
  if (!Number.isFinite(position) || position <= 0) return 0;
  return Math.min(1, position / span);
}

function publishTick() {
  const now = Date.now();
  chrome.runtime.sendMessage({
    type: "reading-tick",
    now,
    url: location.href,
    visible: document.visibilityState === "visible",
    idle: now - lastActivity >= IDLE_MS,
    scrollDepth: currentScroll(),
  }).catch(() => {});
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || message.type !== "snapshot") return false;
  sendResponse({ snapshot: globalThis.autoNoteSnapshot() });
  return false;
});

document.addEventListener("visibilitychange", publishTick);
publishTick();
setInterval(publishTick, 1000);
