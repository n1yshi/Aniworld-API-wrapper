export function normalizeBaseUrl(baseUrl) {
  return String(baseUrl).replace(/\/+$/, "");
}

export function absoluteUrl(baseUrl, value) {
  if (!value) {
    return null;
  }

  try {
    return new URL(value, `${baseUrl}/`).toString();
  } catch {
    return null;
  }
}

export function toAbsoluteAniWorldUrl(baseUrl, value) {
  const url = absoluteUrl(baseUrl, value);
  if (!url) {
    throw new TypeError("A valid AniWorld redirect URL is required.");
  }
  return url;
}

export function extractSlugFromPath(path) {
  const match = String(path ?? "").match(/\/anime\/stream\/([^/?#]+)/i);
  return match ? match[1] : null;
}

export function extractBackgroundUrl(style) {
  const match = String(style ?? "").match(/url\((['"]?)(.*?)\1\)/i);
  return match?.[2] ?? null;
}

export function isRedirectStatus(status) {
  return status >= 300 && status < 400;
}
