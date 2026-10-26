/**
 * Turn a note's Markdown into a small HTML fragment for the clipboard.
 * Every text node is escaped. Link hrefs are emitted only for http and https.
 */

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeHref(value) {
  const raw = String(value ?? "").trim();
  if (!raw || /[\u0000-\u0020\u007F]/.test(raw)) return "";
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    return "";
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "";
  if (!parsed.hostname) return "";
  if (!/^https?:\/\//i.test(parsed.href)) return "";
  return parsed.href;
}

function readCode(text, index) {
  if (text[index] !== "`") return null;
  const close = text.indexOf("`", index + 1);
  if (close <= index + 1) return null;
  return { content: text.slice(index + 1, close), next: close + 1 };
}

function readLink(text, index) {
  if (text[index] !== "[") return null;
  const labelEnd = text.indexOf("]", index + 1);
  if (labelEnd === -1 || text[labelEnd + 1] !== "(") return null;
  let depth = 1;
  let cursor = labelEnd + 2;
  for (; cursor < text.length && depth > 0; cursor += 1) {
    if (text[cursor] === "(") depth += 1;
    else if (text[cursor] === ")") depth -= 1;
    if (depth === 0) break;
  }
  if (depth !== 0) return null;
  return {
    label: text.slice(index + 1, labelEnd),
    url: text.slice(labelEnd + 2, cursor),
    next: cursor + 1,
  };
}

function readWrap(text, index, marker) {
  if (!text.startsWith(marker, index)) return null;
  const close = text.indexOf(marker, index + marker.length);
  if (close <= index + marker.length) return null;
  return {
    content: text.slice(index + marker.length, close),
    next: close + marker.length,
  };
}

function isOpeningBoundary(char) {
  return char === undefined || /[\s([{]/.test(char);
}

function isClosingBoundary(char) {
  return char === undefined || /[\s.,;:!?)\]}]/.test(char);
}

function readItalic(text, index, marker) {
  if (text[index] !== marker || text[index + 1] === marker) return null;
  if (!isOpeningBoundary(text[index - 1])) return null;
  const start = index + 1;
  if (start >= text.length || text[start] === " ") return null;
  for (let cursor = start + 1; cursor < text.length; cursor += 1) {
    if (text[cursor] !== marker || text[cursor + 1] === marker) continue;
    if (text[cursor - 1] === " ") return null;
    if (!isClosingBoundary(text[cursor + 1])) continue;
    return { content: text.slice(start, cursor), next: cursor + 1 };
  }
  return null;
}

function indexOfSpecial(text, from) {
  let at = text.length;
  for (const char of ["`", "[", "*", "_"]) {
    const found = text.indexOf(char, from);
    if (found !== -1 && found < at) at = found;
  }
  return at;
}

function renderInline(text) {
  let html = "";
  let index = 0;
  while (index < text.length) {
    const char = text[index];
    if (char === "`") {
      const code = readCode(text, index);
      if (code) {
        html += `<code>${escapeHtml(code.content)}</code>`;
        index = code.next;
        continue;
      }
    }
    if (char === "[") {
      const link = readLink(text, index);
      if (link) {
        const label = renderInline(link.label);
        const href = safeHref(link.url);
        html += href ? `<a href="${escapeHtml(href)}">${label}</a>` : label;
        index = link.next;
        continue;
      }
    }
    if (text.startsWith("**", index) || text.startsWith("__", index)) {
      const marker = text.slice(index, index + 2);
      const wrapped = readWrap(text, index, marker);
      if (wrapped) {
        html += `<strong>${renderInline(wrapped.content)}</strong>`;
        index = wrapped.next;
        continue;
      }
    }
    if (char === "*" || char === "_") {
      const wrapped = readItalic(text, index, char);
      if (wrapped) {
        html += `<em>${renderInline(wrapped.content)}</em>`;
        index = wrapped.next;
        continue;
      }
    }
    const next = indexOfSpecial(text, index + 1);
    html += escapeHtml(text.slice(index, next));
    index = next;
  }
  return html;
}

function matchUnordered(line) {
  const found = /^\s*[-*+]\s+(\S.*)$/.exec(line);
  return found ? found[1].trim() : "";
}

function matchOrdered(line) {
  const found = /^\s*\d+\.\s+(\S.*)$/.exec(line);
  return found ? found[1].trim() : "";
}

function isBlockStart(line) {
  const trimmed = line.trim();
  return (
    /^(#{1,6})\s+\S/.test(trimmed) ||
    /^[-*+]\s+\S/.test(trimmed) ||
    /^\d+\.\s+\S/.test(trimmed)
  );
}

function parseList(lines, index, kind) {
  const match = kind === "ul" ? matchUnordered : matchOrdered;
  if (!match(lines[index])) return null;
  const items = [];
  let cursor = index;
  while (cursor < lines.length) {
    const content = match(lines[cursor]);
    if (!content) break;
    items.push(`<li>${renderInline(content)}</li>`);
    cursor += 1;
  }
  return {
    html: `<${kind}>\n${items.join("\n")}\n</${kind}>`,
    next: cursor,
  };
}

export function markdownToHtml(markdown) {
  const lines = String(markdown ?? "").replace(/\r\n?/g, "\n").split("\n");
  const blocks = [];
  let index = 0;
  while (index < lines.length) {
    if (!lines[index].trim()) {
      index += 1;
      continue;
    }
    const heading = /^(#{1,6})\s+(\S.*)$/.exec(lines[index].trim());
    if (heading) {
      const level = heading[1].length;
      blocks.push(`<h${level}>${renderInline(heading[2].trim())}</h${level}>`);
      index += 1;
      continue;
    }
    const unordered = parseList(lines, index, "ul");
    if (unordered) {
      blocks.push(unordered.html);
      index = unordered.next;
      continue;
    }
    const ordered = parseList(lines, index, "ol");
    if (ordered) {
      blocks.push(ordered.html);
      index = ordered.next;
      continue;
    }
    const paragraph = [];
    while (index < lines.length && lines[index].trim() && !isBlockStart(lines[index])) {
      paragraph.push(lines[index].trim());
      index += 1;
    }
    blocks.push(`<p>${renderInline(paragraph.join(" "))}</p>`);
  }
  return blocks.join("\n");
}
