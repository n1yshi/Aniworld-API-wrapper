import { load } from "cheerio";
import { localizeEpisodeDisplayTitle, localizeLanguageLabel, resolveResponseLanguage } from "../localization.js";
import { cleanText, normalizeLanguageLabel, parseOptionalNumber } from "../utils/text.js";
import { absoluteUrl } from "../utils/url.js";

function parseLanguageOption($, node, baseUrl, responseLanguage) {
  const element = $(node);
  const key = cleanText(element.attr("data-lang-key"));
  if (!key) {
    return null;
  }

  return {
    key,
    label: localizeLanguageLabel({
      key,
      label: normalizeLanguageLabel(cleanText(element.attr("title"))),
      responseLanguage
    }),
    icon: absoluteUrl(baseUrl, element.attr("src"))
  };
}

function parseStreamOption($, node, baseUrl, languageMap, responseLanguage) {
  const element = $(node);
  const redirectPath = element.attr("data-link-target");
  const redirectId = parseOptionalNumber(element.attr("data-link-id"));
  const languageKey = cleanText(element.attr("data-lang-key"));

  if (!redirectPath || redirectId == null) {
    return null;
  }

  return {
    id: redirectId,
    hoster: cleanText(element.find("h4").first().text()) || cleanText(element.find("i.icon").first().attr("title")),
    languageKey,
    language: languageMap.get(languageKey)?.label ?? localizeLanguageLabel({
      key: languageKey,
      label: null,
      responseLanguage
    }),
    redirectPath,
    redirectUrl: absoluteUrl(baseUrl, redirectPath),
    isExternalEmbed: element.attr("data-external-embed") === "true"
  };
}

export function parseEpisodeStreams(html, { baseUrl, slug, seasonPath, episodeNumber, responseLanguage = "source" }) {
  const $ = load(html);
  const language = resolveResponseLanguage("source", responseLanguage);
  const titleRoot = $(".hosterSiteTitle").first();
  const germanTitle = cleanText(titleRoot.find(".episodeGermanTitle").text());
  const englishTitle = cleanText(titleRoot.find(".episodeEnglishTitle").text());

  const languages = $(".changeLanguageBox img[data-lang-key]")
    .toArray()
    .map((node) => parseLanguageOption($, node, baseUrl, language))
    .filter(Boolean);

  const languageMap = new Map(languages.map((language) => [language.key, language]));

  return {
    slug,
    season: {
      key: seasonPath,
      number: seasonPath === "filme" ? null : parseOptionalNumber(seasonPath.replace("staffel-", "")),
      type: seasonPath === "filme" ? "movies" : "season"
    },
    episode: {
      number: episodeNumber,
      id: parseOptionalNumber(titleRoot.attr("data-episode-id")),
      title: localizeEpisodeDisplayTitle({
        title: germanTitle,
        originalTitle: englishTitle,
        responseLanguage: language
      }),
      germanTitle,
      englishTitle,
      description: cleanText($(".descriptionSpoiler").first().text())
    },
    languages,
    streams: $(".hosterSiteVideo ul li[data-link-id]")
      .toArray()
      .map((node) => parseStreamOption($, node, baseUrl, languageMap, language))
      .filter(Boolean),
    responseLanguage: language
  };
}
