import { resolveResponseLanguage } from "../localization.js";
import { load } from "cheerio";
import { cleanText, parseOptionalNumber, parseYear, splitList } from "../utils/text.js";
import { absoluteUrl, extractBackgroundUrl } from "../utils/url.js";
import { getLinkedTexts, parseSeasonLink } from "./shared.js";

export function parseAnimeDetails(html, { baseUrl, slug, responseLanguage = "source" }) {
  const $ = load(html);
  const language = resolveResponseLanguage("source", responseLanguage);
  const titleNode = $(".series-title h1").first();
  const infoRoot = $(".series-meta").first();
  const descriptionNode = $(".seri_des").first();

  const title = cleanText(titleNode.find("span").first().text());
  const endYearRaw = cleanText(infoRoot.find("[itemprop='endDate']").first().text());
  const coverPath = $(".seriesCoverBox img").first().attr("data-src")
    ?? $(".seriesCoverBox img").first().attr("src");
  const backdropPath = extractBackgroundUrl($(".backdrop").first().attr("style"));

  return {
    slug,
    title,
    alternativeTitles: splitList(titleNode.attr("data-alternativeTitles")),
    years: {
      start: parseYear(infoRoot.find("[itemprop='startDate']").first().text()),
      end: /^heute$/i.test(endYearRaw) ? null : parseYear(endYearRaw),
      isOngoing: /^heute$/i.test(endYearRaw)
    },
    ageRating: cleanText($(".fsk").attr("data-fsk")) || null,
    imdbId: cleanText($(".imdb-link").attr("data-imdb")) || null,
    description: cleanText(descriptionNode.attr("data-full-description") ?? descriptionNode.text()),
    cover: absoluteUrl(baseUrl, coverPath),
    backdrop: absoluteUrl(baseUrl, backdropPath),
    genres: $(".genres a.genreButton")
      .toArray()
      .map((node) => cleanText($(node).text()))
      .filter(Boolean),
    countries: getLinkedTexts($, infoRoot, ".seriesCountry"),
    directors: getLinkedTexts($, infoRoot, ".seriesDirector"),
    actors: getLinkedTexts($, infoRoot, ".seriesActor"),
    producers: getLinkedTexts($, infoRoot, ".seriesProducer"),
    seasons: $(".hosterSiteDirectNav ul")
      .first()
      .find("a[href*='/anime/stream/']")
      .toArray()
      .map((link) => parseSeasonLink($, link, baseUrl, language))
      .filter(Boolean),
    seriesId: parseOptionalNumber($(".add-series").first().attr("data-series-id")),
    responseLanguage: language
  };
}
