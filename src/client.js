import { DEFAULT_BASE_URL, DEFAULT_HEADERS } from "./constants.js";
import { createDebugLogger } from "./debug.js";
import { AniWorldError } from "./errors.js";
import { AniWorldHttpClient } from "./http-client.js";
import { parseAnimeDetails } from "./parsers/anime-details.js";
import { parseEpisodes } from "./parsers/episodes.js";
import { parseSearchResults } from "./parsers/search.js";
import { parseEpisodeStreams } from "./parsers/streams.js";
import { normalizeResponseLanguage, resolveResponseLanguage } from "./localization.js";
import { normalizeEpisodeNumber, normalizeSlug, seasonToPath } from "./utils/inputs.js";
import { normalizeBaseUrl, toAbsoluteAniWorldUrl } from "./utils/url.js";

export class AniWorldClient {
  constructor(options = {}) {
    const baseUrl = normalizeBaseUrl(options.baseUrl ?? DEFAULT_BASE_URL);
    const fetchImpl = options.fetch ?? globalThis.fetch;

    if (typeof fetchImpl !== "function") {
      throw new TypeError("A fetch implementation is required.");
    }

    this.baseUrl = baseUrl;
    this.responseLanguage = normalizeResponseLanguage(options.responseLanguage ?? "source");
    this.debug = createDebugLogger(options.debug);
    this.http = new AniWorldHttpClient({
      baseUrl,
      headers: {
        ...DEFAULT_HEADERS,
        ...(options.headers ?? {})
      },
      fetch: fetchImpl,
      debug: this.debug
    });
  }

  makeUrl(pathname) {
    return this.http.makeUrl(pathname);
  }

  async search(query) {
    if (!query || !String(query).trim()) {
      throw new TypeError("search(query) requires a non-empty query.");
    }

    const payload = await this.http.postJson(
      "/ajax/search",
      new URLSearchParams({
        keyword: String(query).trim()
      }).toString(),
      {
        "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
        "x-requested-with": "XMLHttpRequest"
      }
    );

    if (!Array.isArray(payload)) {
      throw new AniWorldError("AniWorld search returned an unexpected payload.", {
        url: this.makeUrl("/ajax/search")
      });
    }

    return parseSearchResults(payload, this.baseUrl);
  }

  async getAnimeDetails(slug, options = {}) {
    const normalizedSlug = normalizeSlug(slug);
    const responseLanguage = resolveResponseLanguage(this.responseLanguage, options.responseLanguage);
    const html = await this.http.getHtml(`/anime/stream/${normalizedSlug}`);
    const details = parseAnimeDetails(html, {
      baseUrl: this.baseUrl,
      slug: normalizedSlug,
      responseLanguage
    });

    if (!details.title) {
      throw new AniWorldError(`Could not parse anime details for slug "${normalizedSlug}".`, {
        url: this.makeUrl(`/anime/stream/${normalizedSlug}`)
      });
    }

    return details;
  }

  async getEpisodes(slug, season = 1, options = {}) {
    const normalizedSlug = normalizeSlug(slug);
    const seasonPath = seasonToPath(season);
    const responseLanguage = resolveResponseLanguage(this.responseLanguage, options.responseLanguage);
    const html = await this.http.getHtml(`/anime/stream/${normalizedSlug}/${seasonPath}`);

    return parseEpisodes(html, {
      baseUrl: this.baseUrl,
      slug: normalizedSlug,
      seasonPath,
      makeUrl: (pathname) => this.makeUrl(pathname),
      responseLanguage
    });
  }

  async getEpisodeStreams(slug, season, episode, options = {}) {
    const normalizedSlug = normalizeSlug(slug);
    const seasonPath = seasonToPath(season);
    const episodeNumber = normalizeEpisodeNumber(episode);
    const responseLanguage = resolveResponseLanguage(this.responseLanguage, options.responseLanguage);
    const episodePath = `/anime/stream/${normalizedSlug}/${seasonPath}/episode-${episodeNumber}`;
    const html = await this.http.getHtml(episodePath);

    const parsed = parseEpisodeStreams(html, {
      baseUrl: this.baseUrl,
      slug: normalizedSlug,
      seasonPath,
      episodeNumber,
      responseLanguage
    });

    if (options.resolveRedirects) {
      await Promise.all(
        parsed.streams.map(async (stream) => {
          stream.targetUrl = await this.resolveRedirect(stream.redirectUrl);
        })
      );
    }

    const filtered = filterStreamsByLanguage(parsed, options);
    if (filtered.selectedLanguage) {
      filtered.selectedLanguage = {
        ...filtered.selectedLanguage
      };
    }

    return filtered;
  }

  async resolveRedirect(redirect) {
    const url = toAbsoluteAniWorldUrl(this.baseUrl, redirect);
    const response = await this.http.request(url, {
      method: "GET",
      redirect: "manual"
    });

    const location = response.headers.get("location");
    if (!location) {
      throw new AniWorldError("AniWorld redirect did not contain a Location header.", {
        status: response.status,
        url
      });
    }

    return location;
  }
}

export function createAniWorldClient(options) {
  return new AniWorldClient(options);
}

function filterStreamsByLanguage(parsed, options) {
  const languageKey = typeof options.languageKey === "string"
    ? options.languageKey.trim()
    : null;
  const language = typeof options.language === "string"
    ? options.language.trim().toLowerCase()
    : null;

  if (!languageKey && !language) {
    return {
      ...parsed,
      selectedLanguage: null
    };
  }

  const selectedLanguage = parsed.languages.find((entry) => {
    if (languageKey && entry.key === languageKey) {
      return true;
    }
    if (language && entry.label.toLowerCase() === language) {
      return true;
    }
    return false;
  }) ?? null;

  const streams = parsed.streams.filter((stream) => {
    if (selectedLanguage) {
      return stream.languageKey === selectedLanguage.key;
    }
    if (languageKey) {
      return stream.languageKey === languageKey;
    }
    if (language) {
      return stream.language?.toLowerCase() === language;
    }
    return true;
  });

  return {
    ...parsed,
    languages: selectedLanguage ? [selectedLanguage] : parsed.languages,
    streams,
    selectedLanguage
  };
}
