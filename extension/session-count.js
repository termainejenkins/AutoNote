export const SESSION_COUNT_KEY = "autonoteSessionCount";

export const BADGE_COLOR = "#1b7f3a";

const BADGE_CAP = 99;

export function sessionCountFromStored(value) {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) return 0;
  return value;
}

export function loadSessionCount(stored) {
  if (!stored || typeof stored !== "object") return 0;
  return sessionCountFromStored(stored[SESSION_COUNT_KEY]);
}

export function incrementSessionCount(current) {
  const count = sessionCountFromStored(current);
  if (count >= Number.MAX_SAFE_INTEGER) return count;
  return count + 1;
}

export function badgeTextForCount(count) {
  const safe = sessionCountFromStored(count);
  if (safe === 0) return "";
  if (safe > BADGE_CAP) return `${BADGE_CAP}+`;
  return String(safe);
}

export function badgeTitleForCount(count) {
  const safe = sessionCountFromStored(count);
  const notes = safe === 1 ? "note" : "notes";
  return `AutoNote: ${safe} ${notes} this session`;
}

export function sessionBadgeUpdate(count) {
  const safe = sessionCountFromStored(count);
  return {
    text: badgeTextForCount(safe),
    color: BADGE_COLOR,
    title: badgeTitleForCount(safe),
  };
}
