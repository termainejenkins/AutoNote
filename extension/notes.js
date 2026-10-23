import { allNotesToMarkdown, markdownFilename, topicToMarkdown } from "./markdown.js";
import { readNotes, writeNotes } from "./storage-io.js";
import { deleteNote, groupNotes, renameTopic } from "./store.js";

function byId(id) {
  return globalThis.document.getElementById(id);
}

function setStatus(message) {
  byId("status").textContent = message;
}

function download(filename, text) {
  const blob = new Blob([text], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function button(label, className, onClick) {
  const element = document.createElement("button");
  element.type = "button";
  element.textContent = label;
  if (className) element.className = className;
  element.addEventListener("click", onClick);
  return element;
}

async function render() {
  const notes = await readNotes();
  const groups = groupNotes(notes);
  const root = byId("topics");
  root.replaceChildren();
  if (groups.length === 0) {
    const empty = document.createElement("p");
    empty.textContent = "No notes yet. Open a page and click Generate note in the popup.";
    root.append(empty);
    return;
  }

  const exportAll = button("Download all notes", "secondary", () => {
    download("autonote-notes.md", allNotesToMarkdown(groups));
  });
  root.append(exportAll);

  for (const group of groups) {
    const section = document.createElement("section");
    section.className = "card";
    const heading = document.createElement("h2");
    heading.textContent = group.topicTitle;
    section.append(heading);

    const name = document.createElement("input");
    name.type = "text";
    name.value = group.topicTitle;
    name.setAttribute("aria-label", `Topic name for ${group.topicTitle}`);
    const rename = button("Rename topic", "secondary", async () => {
      if (!name.value.trim()) {
        setStatus("Enter a topic name.");
        return;
      }
      await writeNotes(renameTopic(await readNotes(), group.topicKey, name.value));
      setStatus("Topic renamed on this device.");
      await render();
    });
    const copy = button("Copy topic as Markdown", "secondary", async () => {
      const markdown = topicToMarkdown(group);
      const copied = await copyText(markdown);
      setStatus(copied ? "Topic Markdown copied." : "Clipboard was blocked. Use Download topic instead.");
    });
    const save = button("Download topic", "secondary", () => {
      download(markdownFilename(group.topicTitle), topicToMarkdown(group));
    });
    const actions = document.createElement("div");
    actions.className = "actions";
    actions.append(name, rename, copy, save);
    section.append(actions);

    for (const note of group.notes) {
      const article = document.createElement("article");
      const title = document.createElement("h3");
      title.textContent = note.title;
      const meta = document.createElement("p");
      const link = document.createElement("a");
      link.href = note.url;
      link.textContent = note.url;
      link.target = "_blank";
      link.rel = "noreferrer";
      meta.append(`${note.mode === "skim" ? "Skim" : "Study"} · `, link);
      const body = document.createElement("pre");
      body.textContent = note.markdown;
      const remove = button("Delete note", "secondary", async () => {
        if (!confirm("Delete this note from this device?")) return;
        await writeNotes(deleteNote(await readNotes(), note.id));
        setStatus("Note deleted from this device.");
        await render();
      });
      article.append(title, meta, body, remove);
      section.append(article);
    }
    root.append(section);
  }
}

render().catch(() => setStatus("Could not read notes from this device."));
