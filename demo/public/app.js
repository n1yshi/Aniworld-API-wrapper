const state = {
  results: [],
  selectedSlug: null,
  details: null,
  episodes: [],
  selectedSeason: null,
  selectedEpisode: null,
  streams: []
};

const elements = {
  searchForm: document.querySelector("#search-form"),
  searchInput: document.querySelector("#search-input"),
  status: document.querySelector("#status"),
  resultsPanel: document.querySelector("#results-panel"),
  animePanel: document.querySelector("#anime-panel"),
  playerPanel: document.querySelector("#player-panel"),
  results: document.querySelector("#results"),
  animeDetail: document.querySelector("#anime-detail"),
  playerFrame: document.querySelector("#player-frame"),
  playerPlaceholder: document.querySelector("#player-placeholder"),
  openStream: document.querySelector("#open-stream")
};

elements.searchForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const query = elements.searchInput.value.trim();
  if (!query) {
    setStatus("Please enter a search term.", true);
    return;
  }

  setStatus(`Searching for "${query}"...`);

  try {
    const response = await fetchJson(`/api/search?q=${encodeURIComponent(query)}`);
    state.results = response.results.filter((entry) => entry.type === "anime" && entry.slug);
    renderResults();
    setStatus(`Found ${state.results.length} anime result${state.results.length === 1 ? "" : "s"}.`);
  } catch (error) {
    setStatus(error.message, true);
  }
});

renderResults();
renderAnimeDetail();

function renderResults() {
  if (!state.results.length) {
    elements.resultsPanel.classList.add("hidden");
    elements.results.innerHTML = "";
    return;
  }

  elements.resultsPanel.classList.remove("hidden");
  elements.results.innerHTML = state.results.map((entry) => `
    <button class="result-card${entry.slug === state.selectedSlug ? " active" : ""}" data-slug="${escapeHtml(entry.slug)}">
      <h3>${escapeHtml(entry.title)}</h3>
      <p>${escapeHtml(entry.description || "No description available.")}</p>
    </button>
  `).join("");

  for (const button of elements.results.querySelectorAll("[data-slug]")) {
    button.addEventListener("click", () => openAnime(button.dataset.slug));
  }
}

function renderAnimeDetail() {
  if (!state.details) {
    elements.animePanel.classList.add("hidden");
    elements.animeDetail.innerHTML = "";
    return;
  }

  elements.animePanel.classList.remove("hidden");

  const seasons = state.details.seasons ?? [];
  const episodeButtons = state.episodes.map((episode) => `
    <button class="episode-pill${episode.number === state.selectedEpisode ? " active" : ""}" data-episode="${episode.number}">
      Episode ${episode.number}
    </button>
  `).join("");

  const streamButtons = state.streams.map((stream) => `
    <button class="stream-button" data-stream-url="${escapeHtml(stream.targetUrl || stream.redirectUrl)}">
      ${escapeHtml(stream.hoster)}
      <small>${escapeHtml(stream.language || "Unknown language")}</small>
    </button>
  `).join("");

  elements.animeDetail.innerHTML = `
    <div class="anime-summary">
      <img class="anime-poster" src="${escapeHtml(state.details.cover || "")}" alt="${escapeHtml(state.details.title)} cover">
      <div class="meta">
        <h3>${escapeHtml(state.details.title)}</h3>
        <div class="inline-meta">
          <span>${formatYears(state.details.years)}</span>
          ${state.details.ageRating ? `<span>Age ${escapeHtml(state.details.ageRating)}</span>` : ""}
          ${state.details.imdbId ? `<span>${escapeHtml(state.details.imdbId)}</span>` : ""}
        </div>
        <p>${escapeHtml(state.details.description || "No description available.")}</p>
        <div class="chip-row">
          ${(state.details.genres || []).slice(0, 12).map((genre) => `<span class="chip">${escapeHtml(genre)}</span>`).join("")}
        </div>
      </div>
    </div>

    <div class="stack">
      <div>
        <h4>Seasons</h4>
        <div class="chip-row">
          ${seasons.map((season) => `
            <button class="season-button${season.key === state.selectedSeason ? " active" : ""}" data-season="${escapeHtml(season.key)}">
              ${escapeHtml(season.title)}
            </button>
          `).join("")}
        </div>
      </div>

      <div>
        <h4>Episodes</h4>
        <div class="episodes-grid">
          ${episodeButtons || '<span class="chip">No episodes loaded yet.</span>'}
        </div>
      </div>

      <div>
        <h4>Streams</h4>
        <div class="stream-grid">
          ${streamButtons || '<span class="chip">Select an episode to load streams.</span>'}
        </div>
      </div>
    </div>
  `;

  for (const button of elements.animeDetail.querySelectorAll("[data-season]")) {
    button.addEventListener("click", () => loadSeason(button.dataset.season));
  }

  for (const button of elements.animeDetail.querySelectorAll("[data-episode]")) {
    button.addEventListener("click", () => loadStreams(Number(button.dataset.episode)));
  }

  for (const button of elements.animeDetail.querySelectorAll("[data-stream-url]")) {
    button.addEventListener("click", () => openStream(button.dataset.streamUrl));
  }
}

async function openAnime(slug) {
  setStatus("Loading anime details...");
  resetPlayer();
  state.selectedSlug = slug;
  state.details = null;
  state.episodes = [];
  state.streams = [];
  renderResults();
  renderAnimeDetail();

  try {
    const details = await fetchJson(`/api/anime/${encodeURIComponent(slug)}/details`);
    state.details = details;
    state.selectedSeason = details.seasons?.find((season) => season.type === "season")?.key
      || details.seasons?.[0]?.key
      || "staffel-1";
    await loadSeason(state.selectedSeason, { silent: true });
    setStatus(`Loaded ${details.title}.`);
  } catch (error) {
    setStatus(error.message, true);
  }
}

async function loadSeason(seasonKey, options = {}) {
  if (!state.selectedSlug) {
    return;
  }

  state.selectedSeason = seasonKey;
  state.selectedEpisode = null;
  state.episodes = [];
  state.streams = [];
  renderAnimeDetail();

  if (!options.silent) {
    setStatus(`Loading ${seasonKey}...`);
  }

  try {
    const result = await fetchJson(`/api/anime/${encodeURIComponent(state.selectedSlug)}/episodes?season=${encodeURIComponent(seasonKey)}`);
    state.episodes = result.episodes;
    state.selectedEpisode = result.episodes[0]?.number ?? null;
    renderAnimeDetail();

    if (state.selectedEpisode != null) {
      await loadStreams(state.selectedEpisode, { silent: true });
    } else {
      setStatus("No episodes found for this season.");
    }
  } catch (error) {
    setStatus(error.message, true);
  }
}

async function loadStreams(episodeNumber, options = {}) {
  if (!state.selectedSlug || !state.selectedSeason) {
    return;
  }

  state.selectedEpisode = episodeNumber;
  state.streams = [];
  renderAnimeDetail();

  if (!options.silent) {
    setStatus(`Loading streams for episode ${episodeNumber}...`);
  }

  try {
    const result = await fetchJson(`/api/anime/${encodeURIComponent(state.selectedSlug)}/streams?season=${encodeURIComponent(state.selectedSeason)}&episode=${encodeURIComponent(episodeNumber)}&resolveRedirects=true`);
    state.streams = result.streams;
    renderAnimeDetail();

    if (state.streams[0]?.targetUrl || state.streams[0]?.redirectUrl) {
      openStream(state.streams[0].targetUrl || state.streams[0].redirectUrl);
    }

    setStatus(`Loaded ${state.streams.length} stream source${state.streams.length === 1 ? "" : "s"} for episode ${episodeNumber}.`);
  } catch (error) {
    setStatus(error.message, true);
  }
}

function openStream(url) {
  elements.playerPanel.classList.remove("hidden");
  elements.playerFrame.src = url;
  elements.playerFrame.style.display = "block";
  elements.playerPlaceholder.style.display = "none";
  elements.openStream.href = url;
  elements.openStream.classList.remove("is-disabled");
}

function resetPlayer() {
  elements.playerPanel.classList.add("hidden");
  elements.playerFrame.removeAttribute("src");
  elements.playerFrame.style.display = "none";
  elements.playerPlaceholder.style.display = "grid";
  elements.openStream.href = "#";
  elements.openStream.classList.add("is-disabled");
}

async function fetchJson(url) {
  const response = await fetch(url);
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error || "Request failed.");
  }

  return payload;
}

function setStatus(message, isError = false) {
  elements.status.textContent = message;
  elements.status.className = isError ? "status error" : "status";
}

function formatYears(years) {
  if (!years) {
    return "Unknown years";
  }

  if (years.isOngoing) {
    return `${years.start || "?"} - Present`;
  }

  if (years.start && years.end) {
    return `${years.start} - ${years.end}`;
  }

  return String(years.start || years.end || "Unknown years");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
