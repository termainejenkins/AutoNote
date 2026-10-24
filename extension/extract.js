export const TEXT_LIMIT = 12000;

const BLOCKED_HOST_SUFFIXES = [
  "mail.google.com",
  "outlook.live.com",
  "outlook.office.com",
  "outlook.office365.com",
  "mail.yahoo.com",
  "accounts.google.com",
  "paypal.com",
  "chase.com",
  "bankofamerica.com",
  "wellsfargo.com",
];

const BLOCKED_SEGMENTS = ["checkout", "cart", "signin", "login", "account"];

const BLOCKED_PROTOCOLS = new Set([
  "chrome:",
  "chrome-extension:",
  "chrome-untrusted:",
  "edge:",
  "about:",
  "devtools:",
  "view-source:",
  "moz-extension:",
]);

function htmlHasPassword(html) {
  return /<input\b[^>]*\btype\s*=\s*(?:"password"|'password'|password\b)[^>]*>/i.test(
    html,
  );
}

function pathHasSegment(pathname, segment) {
  return pathname
    .toLowerCase()
    .split("/")
    .filter(Boolean)
    .includes(segment);
}

export function skipReason({ url, hasPassword = false, html = "" }) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return "This page URL can't be read.";
  }

  if (BLOCKED_PROTOCOLS.has(parsed.protocol)) {
    return "Browser pages are skipped.";
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return "Only http and https pages can be noted.";
  }
  if (hasPassword || htmlHasPassword(html)) {
    return "Pages with a password field are skipped.";
  }

  const host = parsed.hostname.toLowerCase();
  if (host === "gov" || host.endsWith(".gov") || host.endsWith(".gov.uk")) {
    return "Government sites are on the default blocklist.";
  }
  for (const suffix of BLOCKED_HOST_SUFFIXES) {
    if (host === suffix || host.endsWith(`.${suffix}`)) {
      return "This site is on the default blocklist (mail, banking, or payments).";
    }
  }
  for (const segment of BLOCKED_SEGMENTS) {
    if (pathHasSegment(parsed.pathname, segment)) {
      return "Checkout, cart, login, and account pages are skipped.";
    }
  }
  return "";
}

function stripNoise(html) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, " ")
    .replace(/<nav\b[^>]*>[\s\S]*?<\/nav>/gi, " ")
    .replace(/<footer\b[^>]*>[\s\S]*?<\/footer>/gi, " ")
    .replace(/<form\b[^>]*>[\s\S]*?<\/form>/gi, " ");
}

function innerOf(html, tag) {
  const match = html.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? match[1] : "";
}

function pickRegion(html) {
  return innerOf(html, "article") || innerOf(html, "main") || innerOf(html, "body") || html;
}

function decodeEntities(text) {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'");
}

export function textFromHtml(html) {
  const withBreaks = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6]|tr|blockquote|section)>/gi, "\n");
  const stripped = withBreaks.replace(/<[^>]+>/g, " ");
  return decodeEntities(stripped)
    .replace(/[ \t]+\n/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function headingsFrom(html) {
  const headings = [];
  const pattern = /<h([1-3])\b[^>]*>([\s\S]*?)<\/h\1>/gi;
  let match = pattern.exec(html);
  while (match) {
    const text = textFromHtml(match[2]);
    if (text) headings.push(text);
    match = pattern.exec(html);
  }
  return headings.slice(0, 20);
}

function titleFrom(html) {
  const match = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  return match ? textFromHtml(match[1]) : "";
}

export function extractPage({
  url,
  title = "",
  html = "",
  hasPassword = false,
  regionChosen = false,
}) {
  const source = typeof html === "string" ? html : "";
  const reason = skipReason({ url, hasPassword, html: source });
  if (reason) {
    return { status: "skipped", reason, url };
  }

  const cleaned = stripNoise(source);
  const region = regionChosen ? cleaned : pickRegion(cleaned);
  const headings = headingsFrom(region);
  let text = textFromHtml(region);
  let truncated = false;
  if (text.length > TEXT_LIMIT) {
    text = text.slice(0, TEXT_LIMIT).trim();
    truncated = true;
  }
  const pageTitle = (title || titleFrom(source) || headings[0] || url || "").trim();
  if (!text) {
    return {
      status: "skipped",
      reason: "No readable text was found on this page.",
      url,
    };
  }
  return {
    status: "ok",
    url,
    title: pageTitle,
    headings,
    text,
    truncated,
  };
}
