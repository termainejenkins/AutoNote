import { TEXT_LIMIT } from "./extract.js";

function cleanLine(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

export function buildPrompt({ mode, title, url, headings = [], text }) {
  const style = mode === "skim" ? "skim" : "study";
  const excerpt = String(text || "").slice(0, TEXT_LIMIT);
  const headingLines = headings.map(cleanLine).filter(Boolean).slice(0, 20);
  const shape =
    style === "skim"
      ? '{"summary":"2 or 3 sentences","takeaways":["short point"]}'
      : '{"summary":"one paragraph","keyTerms":[{"term":"name","meaning":"short definition"}],"questions":["question 1","question 2","question 3"]}';
  const instructions =
    style === "skim"
      ? "summary is 2 or 3 sentences. takeaways has 3 to 5 short points."
      : "summary is one paragraph. keyTerms has 3 to 6 items from the text. questions has exactly 3 review questions.";

  return [
    "You write reading notes from a page the person is viewing in their own browser.",
    "Use only the extracted text below. Do not invent sources, quotes, or facts that are not in that text.",
    `Mode: ${style}.`,
    `Return JSON only, with no markdown fence, matching this shape: ${shape}`,
    instructions,
    `Title: ${cleanLine(title) || "Untitled page"}`,
    `URL: ${url}`,
    `Headings:\n${headingLines.join("\n") || "(none)"}`,
    "Extracted text:",
    excerpt,
  ].join("\n\n");
}

function asText(value) {
  return cleanLine(value);
}

function asList(value) {
  if (!Array.isArray(value)) return [];
  return value.map(asText).filter(Boolean);
}

export function renderNoteMarkdown(mode, json) {
  const summary = asText(json && json.summary);
  if (!summary) {
    return { ok: false, message: "Gemini returned a note with no summary." };
  }
  if (mode === "skim") {
    const takeaways = asList(json.takeaways).slice(0, 8);
    const lines = [summary, ""];
    for (const item of takeaways) lines.push(`- ${item}`);
    return { ok: true, markdown: lines.join("\n").trim() };
  }

  const terms = Array.isArray(json.keyTerms) ? json.keyTerms : [];
  const termLines = terms.slice(0, 8).map((term) => {
    if (typeof term === "string") return `- ${asText(term)}`;
    const name = asText(term && term.term);
    const meaning = asText(term && term.meaning);
    if (!name) return "";
    return meaning ? `- **${name}:** ${meaning}` : `- **${name}**`;
  }).filter(Boolean);
  const questions = asList(json.questions).slice(0, 3);
  const lines = [summary, "", "### Key terms", ...(termLines.length ? termLines : ["- (none returned)"])];
  lines.push("", "### Review questions");
  if (questions.length === 0) {
    lines.push("1. (none returned)");
  } else {
    questions.forEach((question, index) => lines.push(`${index + 1}. ${question}`));
  }
  return { ok: true, markdown: lines.join("\n").trim() };
}
