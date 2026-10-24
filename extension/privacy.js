export const PATTERN_LIMIT = 100;

const BLOCK_MESSAGES = {
  government: "Government sites are on the default blocklist.",
  host: "This site is on the default blocklist (mail, banking, or payments).",
  path: "Checkout, cart, login, and account pages are skipped.",
};

export const BUILTIN_BLOCK_RULES = [
  { id: "gov", pattern: ".gov", kind: "government", label: "Government" },
  { id: "gov-uk", pattern: ".gov.uk", kind: "government", label: "Government" },
  { id: "mail-google", pattern: "mail.google.com", kind: "host", label: "Mail" },
  { id: "outlook-live", pattern: "outlook.live.com", kind: "host", label: "Mail" },
  { id: "outlook-office", pattern: "outlook.office.com", kind: "host", label: "Mail" },
  { id: "outlook-365", pattern: "outlook.office365.com", kind: "host", label: "Mail" },
  { id: "yahoo-mail", pattern: "mail.yahoo.com", kind: "host", label: "Mail" },
  { id: "google-accounts", pattern: "accounts.google.com", kind: "host", label: "Account" },
  { id: "paypal", pattern: "paypal.com", kind: "host", label: "Payments" },
  { id: "chase", pattern: "chase.com", kind: "host", label: "Banking" },
  { id: "bofa", pattern: "bankofamerica.com", kind: "host", label: "Banking" },
  { id: "wellsfargo", pattern: "wellsfargo.com", kind: "host", label: "Banking" },
  { id: "path-checkout", pattern: "/checkout", kind: "path", label: "Checkout" },
  { id: "path-cart", pattern: "/cart", kind: "path", label: "Cart" },
  { id: "path-signin", pattern: "/signin", kind: "path", label: "Login" },
  { id: "path-login", pattern: "/login", kind: "path", label: "Login" },
  { id: "path-account", pattern: "/account", kind: "path", label: "Account" },
];

export function normalizePattern(value) {
  if (typeof value !== "string") return "";
  let text = value.trim().toLowerCase().replace(/\s+/g, "");
  if (!text || text.length > 300) return "";
  if (text.length > 1) text = text.replace(/\/+$/, "");
  if (!/[a-z0-9]/.test(text)) return "";
  if (text === "http:" || text === "https:" || text === "http" || text === "https") return "";
  return text;
}

export function normalizePatternList(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  const result = [];
  for (const item of value) {
    const pattern = normalizePattern(item);
    if (!pattern || seen.has(pattern)) continue;
    seen.add(pattern);
    result.push(pattern);
    if (result.length >= PATTERN_LIMIT) break;
  }
  return result;
}

export function normalizeDomain(value) {
  const pattern = normalizePattern(value);
  if (!pattern || pattern.startsWith("/")) return "";
  let body = pattern.replace(/^https?:\/\//, "");
  const slash = body.indexOf("/");
  if (slash !== -1) body = body.slice(0, slash);
  body = body.split("?")[0].split("#")[0].replace(/^\*\./, "").replace(/:\d+$/, "").replace(/\.$/, "");
  if (body === "localhost") return body;
  if (!/^[a-z0-9.-]+$/.test(body)) return "";
  if (!body.includes(".") || body.startsWith(".") || body.endsWith(".") || body.includes("..")) return "";
  return body;
}

export function normalizeAllowlist(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  const result = [];
  for (const item of value) {
    const domain = normalizeDomain(item);
    if (!domain || seen.has(domain)) continue;
    seen.add(domain);
    result.push(domain);
    if (result.length >= PATTERN_LIMIT) break;
  }
  return result;
}

export function isBuiltinPattern(pattern) {
  const target = normalizePattern(pattern);
  if (!target) return false;
  return BUILTIN_BLOCK_RULES.some((rule) => normalizePattern(rule.pattern) === target);
}

export function normalizeBlocklist(value) {
  return normalizePatternList(value).filter((pattern) => !isBuiltinPattern(pattern));
}

export function addBlockPattern(list, pattern) {
  const current = normalizeBlocklist(list);
  if (isBuiltinPattern(pattern)) {
    return { list: current, added: false, builtin: true, duplicate: false };
  }
  const target = normalizePattern(pattern);
  if (!target) return { list: current, added: false, builtin: false, duplicate: false };
  if (current.includes(target)) {
    return { list: current, added: false, builtin: false, duplicate: true };
  }
  if (current.length >= PATTERN_LIMIT) {
    return { list: current, added: false, builtin: false, duplicate: false, full: true };
  }
  return { list: [...current, target], added: true, builtin: false, duplicate: false };
}

export function removeBlockPattern(list, pattern) {
  const current = normalizeBlocklist(list);
  if (isBuiltinPattern(pattern)) return current;
  const target = normalizePattern(pattern);
  if (!target) return current;
  return current.filter((item) => item !== target);
}

export function addAllowDomain(list, value) {
  const current = normalizeAllowlist(list);
  const domain = normalizeDomain(value);
  if (!domain) return { list: current, added: false, duplicate: false };
  if (current.includes(domain)) return { list: current, added: false, duplicate: true };
  if (current.length >= PATTERN_LIMIT) return { list: current, added: false, duplicate: false, full: true };
  return { list: [...current, domain], added: true, duplicate: false };
}

export function removeAllowDomain(list, value) {
  const target = normalizeDomain(value);
  const current = normalizeAllowlist(list);
  if (!target) return current;
  return current.filter((domain) => domain !== target);
}

function wildcardMatch(value, pattern) {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  return new RegExp(`^${escaped}$`, "i").test(value);
}

function hostMatches(hostname, pattern) {
  const host = String(hostname || "").toLowerCase().replace(/\.$/, "");
  const spec = String(pattern || "").toLowerCase().replace(/\.$/, "").replace(/^\*\./, "").replace(/:\d+$/, "");
  if (!host || !spec || spec.includes("/")) return false;
  if (spec.startsWith(".")) {
    const bare = spec.slice(1);
    return host === bare || host.endsWith(spec);
  }
  if (spec.includes("*")) return wildcardMatch(host, spec);
  return host === spec || host.endsWith(`.${spec}`);
}

function pathMatches(pathname, pattern) {
  const path = pathname.toLowerCase() || "/";
  let spec = pattern.toLowerCase();
  if (!spec.startsWith("/")) spec = `/${spec}`;
  if (spec.length > 1) spec = spec.replace(/\/+$/, "");
  if (spec.includes("*")) {
    const escaped = spec.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "[^/]*");
    return new RegExp(`^${escaped}$`, "i").test(path);
  }
  if (path === spec || path.startsWith(`${spec}/`)) return true;
  const segments = spec.split("/").filter(Boolean);
  if (segments.length !== 1) return false;
  return path.split("/").filter(Boolean).includes(segments[0]);
}

export function patternMatches(url, pattern) {
  const spec = normalizePattern(pattern);
  if (!spec) return false;
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
  const host = parsed.hostname.toLowerCase().replace(/\.$/, "");
  const path = parsed.pathname.toLowerCase() || "/";
  let body = spec.replace(/^https?:\/\//, "");
  if (!body.includes("/") && !body.includes(".") && body !== "localhost") {
    body = `/${body}`;
  }
  if (body.startsWith("/")) return pathMatches(path, body);
  const slash = body.indexOf("/");
  const hostPart = (slash === -1 ? body : body.slice(0, slash)).split("?")[0].split("#")[0];
  const pathPart = slash === -1 ? "" : `/${body.slice(slash + 1).split("?")[0].split("#")[0]}`;
  if (!hostPart || !hostMatches(host, hostPart)) return false;
  if (pathPart && pathPart !== "/") return pathMatches(path, pathPart);
  return true;
}

export function domainListed(url, domains) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
  const host = parsed.hostname.toLowerCase().replace(/\.$/, "");
  return normalizeAllowlist(domains).some((domain) => hostMatches(host, domain));
}

export function builtinBlockReason(url) {
  for (const rule of BUILTIN_BLOCK_RULES) {
    if (patternMatches(url, rule.pattern)) return BLOCK_MESSAGES[rule.kind];
  }
  return "";
}

export function userBlockReason(url, patterns) {
  for (const pattern of normalizeBlocklist(patterns)) {
    if (patternMatches(url, pattern)) {
      return `This page is on your blocklist (${pattern}).`;
    }
  }
  return "";
}

export function gatePage(url, settings) {
  const blocklist = normalizeBlocklist(settings?.blocklist);
  const allowlistEnabled = settings?.allowlistEnabled === true;
  const allowlist = normalizeAllowlist(settings?.allowlist);
  const builtin = builtinBlockReason(url);
  if (builtin) return { ok: false, code: "blocked", message: builtin };
  const user = userBlockReason(url, blocklist);
  if (user) return { ok: false, code: "blocked", message: user };
  if (allowlistEnabled && !domainListed(url, allowlist)) {
    const message = allowlist.length === 0
      ? "Only these sites is on, and no domains are listed yet."
      : "Only these sites is on, and this page is not in that list.";
    return { ok: false, code: "allowlist", message };
  }
  return { ok: true, code: "allowed", message: "" };
}
