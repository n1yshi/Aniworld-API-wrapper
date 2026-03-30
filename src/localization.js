import { LANGUAGE_LABELS, LANGUAGE_LABELS_EN } from "./constants.js";
import { cleanText } from "./utils/text.js";

const SUPPORTED_RESPONSE_LANGUAGES = new Set(["source", "en"]);

export function normalizeResponseLanguage(value) {
  const normalized = String(value ?? "source").trim().toLowerCase();

  if (!normalized || normalized === "source" || normalized === "default" || normalized === "de") {
    return "source";
  }

  if (normalized === "en" || normalized === "english") {
    return "en";
  }

  throw new TypeError('responseLanguage must be "source" or "en".');
}

export function resolveResponseLanguage(defaultLanguage, overrideLanguage) {
  return normalizeResponseLanguage(overrideLanguage ?? defaultLanguage ?? "source");
}

export function localizeSeasonTitle(key, responseLanguage) {
  if (responseLanguage === "en") {
    return key === "filme" ? "Movies" : `Season ${key.replace("staffel-", "")}`;
  }

  return key === "filme" ? "Filme" : `Staffel ${key.replace("staffel-", "")}`;
}

export function localizeLanguageLabel({ key, label, responseLanguage }) {
  if (responseLanguage !== "en") {
    return label ?? LANGUAGE_LABELS.get(key) ?? key ?? null;
  }

  const cleanedLabel = cleanText(label);
  return LANGUAGE_LABELS_EN.get(key)
    ?? translateKnownSourceLanguageLabel(cleanedLabel)
    ?? cleanedLabel
    ?? key
    ?? null;
}

export function localizeEpisodeDisplayTitle({ title, originalTitle, responseLanguage }) {
  if (responseLanguage === "en" && cleanText(originalTitle)) {
    return cleanText(originalTitle);
  }

  return cleanText(title);
}

function translateKnownSourceLanguageLabel(label) {
  if (!label) {
    return null;
  }

  const normalized = label.toLowerCase();
  if (normalized === "deutsch") {
    return "German";
  }
  if (normalized === "deutsch mit untertiteln") {
    return "German with subtitles";
  }
  if (normalized === "englisch mit untertiteln") {
    return "English with subtitles";
  }
  return null;
}
