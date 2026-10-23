globalThis.document.getElementById("open-options").addEventListener("click", () => {
  globalThis.chrome.runtime.openOptionsPage();
});
