import { load } from "cheerio";
import { localizeEpisodeDisplayTitle, localizeLanguageLabel, resolveResponseLanguage } from "../localization.js";
import { cleanText, normalizeLanguageLabel, parseOptionalNumber, unique } from "../utils/text.js";
import { absoluteUrl } from "../utils/url.js";
import { formatSeasonTitle } from "./shared.js";

function parseEpisodeRow($, row, baseUrl, responseLanguage) {
  const element = $(row);
  const link = element.find("td.seasonEpisodeTitle a").first();
  const href = link.attr("href");
  const number = parseOptionalNumber(element.find("[itemprop='episodeNumber']").attr("content"));

  if (!href || number == null) {
    return null;
  }

  const hosters = element
    .find("td:eq(2) i.icon[title]")
    .toArray()
    .map((icon) => cleanText($(icon).attr("title")))
    .filter(Boolean);

  const languages = element
    .find("td.editFunctions img.flag[title]")
    .toArray()
    .map((img) => localizeLanguageLabel({
      key: null,
      label: normalizeLanguageLabel(cleanText($(img).attr("title"))),
      responseLanguage
    }))
    .filter(Boolean);

  const title = cleanText(link.find("strong").text());
  const originalTitle = cleanText(link.find("span").text());

  return {
    id: parseOptionalNumber(element.attr("data-episode-id")),
    seasonEpisodeId: parseOptionalNumber(element.attr("data-episode-season-id")),
    number,
    title,
    originalTitle,
    displayTitle: localizeEpisodeDisplayTitle({
      title,
      originalTitle,
      responseLanguage
    }),
    path: href,
    url: absoluteUrl(baseUrl, href),
    availableHosters: unique(hosters),
    availableLanguages: unique(languages)
  };
}

export function parseEpisodes(html, { baseUrl, slug, seasonPath, makeUrl, responseLanguage = "source" }) {
  const $ = load(html);
  const language = resolveResponseLanguage("source", responseLanguage);
  const seasonEntry = $(".hosterSiteDirectNav ul")
    .first()
    .find(`a[href$='/${seasonPath}']`)
    .first();

  return {
    slug,
    season: {
      key: seasonPath,
      number: seasonPath === "filme" ? null : parseOptionalNumber(seasonPath.replace("staffel-", "")),
      type: seasonPath === "filme" ? "movies" : "season",
      title: formatSeasonTitle(seasonPath, language),
      path: `/anime/stream/${slug}/${seasonPath}`,
      url: makeUrl(`/anime/stream/${slug}/${seasonPath}`)
    },
    episodes: $("tr[data-episode-id]")
      .toArray()
      .map((row) => parseEpisodeRow($, row, baseUrl, language))
      .filter(Boolean),
    responseLanguage: language
  };
}
