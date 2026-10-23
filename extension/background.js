console.info("AutoNote service worker started");

globalThis.chrome.runtime.onInstalled.addListener((details) => {
  console.info(`AutoNote service worker installed (${details.reason})`);
});
