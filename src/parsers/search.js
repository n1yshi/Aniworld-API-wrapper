import { stripHtml } from "../utils/text.js";
import { absoluteUrl, extractSlugFromPath } from "../utils/url.js";

export function parseSearchResults(entries, baseUrl) {
  if (!Array.isArray(entries)) {
    return [];
  }

  return entries.map((entry) => {
    const path = entry.link ?? null;
    const link = absoluteUrl(baseUrl, entry.link);
    const slug = extractSlugFromPath(path);
    const isAniWorldAnime = /^\/anime\/stream\//i.test(path ?? "");
    const isEpisode = /\/staffel-\d+\/episode-\d+$/i.test(path ?? "");
    const type = !isAniWorldAnime ? "support" : (isEpisode ? "episode" : "anime");

    return {
      title: stripHtml(entry.title),
      description: stripHtml(entry.description),
      link,
      path,
      slug,
      type
    };
  });
}
