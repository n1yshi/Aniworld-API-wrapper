export function normalizeSlug(slug) {
  const value = String(slug ?? "").trim();
  if (!value) {
    throw new TypeError("A slug is required.");
  }

  const match = value.match(/\/anime\/stream\/([^/?#]+)/i);
  return match ? match[1] : value.replace(/^\/+|\/+$/g, "");
}

export function normalizeEpisodeNumber(episode) {
  const value = Number(episode);
  if (!Number.isInteger(value) || value <= 0) {
    throw new TypeError("episode must be a positive integer.");
  }
  return value;
}

export function seasonToPath(season) {
  if (typeof season === "string") {
    const normalized = season.trim().toLowerCase();
    if (!normalized) {
      throw new TypeError("season must not be empty.");
    }
    if (normalized === "filme" || normalized === "movies") {
      return "filme";
    }
    if (normalized.startsWith("staffel-")) {
      return normalized;
    }
    const asNumber = Number(normalized);
    if (Number.isInteger(asNumber) && asNumber > 0) {
      return `staffel-${asNumber}`;
    }
  }

  if (Number.isInteger(season) && season > 0) {
    return `staffel-${season}`;
  }

  throw new TypeError('season must be a positive integer, "staffel-N", or "filme".');
}
