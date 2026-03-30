import { AniWorldError } from "./errors.js";
import { absoluteUrl, isRedirectStatus } from "./utils/url.js";

export class AniWorldHttpClient {
  constructor(options) {
    this.baseUrl = options.baseUrl;
    this.headers = options.headers;
    this.fetch = options.fetch;
    this.debug = options.debug;
  }

  makeUrl(pathname) {
    return absoluteUrl(this.baseUrl, pathname);
  }

  async getHtml(pathname) {
    const response = await this.request(pathname);
    return response.text();
  }

  async postJson(pathname, body, headers = {}) {
    const response = await this.request(pathname, {
      method: "POST",
      headers,
      body
    });
    return response.json();
  }

  async request(pathname, options = {}) {
    const url = pathname.startsWith("http") ? pathname : this.makeUrl(pathname);
    const method = options.method ?? "GET";

    this.debug("request:start", { method, url });

    let response;
    try {
      response = await this.fetch(url, {
        ...options,
        headers: {
          ...this.headers,
          ...(options.headers ?? {})
        }
      });
    } catch (error) {
      this.debug("request:error", { method, url, error: error?.message ?? String(error) });
      throw new AniWorldError(`Request to AniWorld failed for ${url}.`, {
        cause: error,
        url
      });
    }

    this.debug("request:done", {
      method,
      url,
      status: response.status,
      ok: response.ok
    });

    if (!response.ok && !(options.redirect === "manual" && isRedirectStatus(response.status))) {
      throw new AniWorldError(`AniWorld returned HTTP ${response.status} for ${url}.`, {
        status: response.status,
        url
      });
    }

    return response;
  }
}
