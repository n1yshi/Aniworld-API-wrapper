export function cleanText(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .replace(/&#8230;/g, "...")
    .trim();
}

export function stripHtml(value) {
  return cleanText(String(value ?? "").replace(/<[^>]+>/g, ""));
}

export function splitList(value) {
  return String(value ?? "")
    .split(",")
    .map((entry) => cleanText(entry))
    .filter(Boolean);
}

export function parseYear(value) {
  const match = cleanText(value).match(/\b(19|20)\d{2}\b/);
  return match ? Number(match[0]) : null;
}

export function parseOptionalNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeLanguageLabel(value) {
  const normalized = cleanText(value);
  if (!normalized) {
    return null;
  }

  if (/^deutsch\/german$/i.test(normalized)) {
    return "Deutsch";
  }
  if (/^mit deutschem untertitel$/i.test(normalized) || /^mit untertitel deutsch$/i.test(normalized)) {
    return "Deutsch mit Untertiteln";
  }
  if (/^englisch$/i.test(normalized) || /^mit untertitel englisch$/i.test(normalized)) {
    return "Englisch mit Untertiteln";
  }

  return normalized;
}

export function unique(values) {
  return [...new Set(values)];
}
