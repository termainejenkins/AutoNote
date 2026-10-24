function oneLine(value) {
  return String(value || "").replace(/\s+/g, " ").trim() || "Untitled";
}

export function topicToMarkdown(group) {
  const lines = [`# ${oneLine(group.topicTitle)}`, ""];
  for (const note of group.notes) {
    lines.push(`## ${oneLine(note.title)}`, "");
    lines.push(`[Source](${note.url})`, "");
    lines.push(String(note.markdown || "").trim(), "");
  }
  return `${lines.join("\n").trim()}\n`;
}

export function allNotesToMarkdown(groups) {
  if (!groups.length) return "";
  return `${groups.map((group) => topicToMarkdown(group).trim()).join("\n\n")}\n`;
}

export function markdownFilename(title) {
  const cleaned = String(title || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${cleaned || "autonote"}.md`;
}
