import { localizeSeasonTitle } from "../localization.js";
import { cleanText, parseOptionalNumber, unique } from "../utils/text.js";
import { absoluteUrl } from "../utils/url.js";

export function formatSeasonTitle(key, responseLanguage = "source") {
  return localizeSeasonTitle(key, responseLanguage);
}

export function parseSeasonLink($, link, baseUrl, responseLanguage = "source") {
  const href = $(link).attr("href");
  if (!href) {
    return null;
  }

  const key = href.split("/").at(-1) ?? "";
  const number = key === "filme" ? null : parseOptionalNumber(key.replace("staffel-", ""));

  return {
    key,
    number,
    type: key === "filme" ? "movies" : "season",
    title: formatSeasonTitle(key, responseLanguage),
    path: href,
    url: absoluteUrl(baseUrl, href),
    active: $(link).hasClass("active")
  };
}

export function getLinkedTexts($, root, selector) {
  const marker = root.find(selector).first();
  if (!marker.length) {
    return [];
  }

  const scope = marker.closest("li");
  return unique(
    (scope.length ? scope : marker.parent())
      .find("a")
      .toArray()
      .map((node) => cleanText($(node).text()))
      .filter(Boolean)
  );
}
