function autoNoteSnapshot() {
  const hasPassword = Boolean(document.querySelector('input[type="password"]'));
  const root = document.querySelector("article") || document.querySelector("main") || document.body;
  const html = !hasPassword && root ? root.innerHTML.slice(0, 200000) : "";
  return {
    url: location.href,
    title: document.title || "",
    hasPassword,
    html,
    regionChosen: Boolean(root),
  };
}

globalThis.autoNoteSnapshot = autoNoteSnapshot;
