import test from "node:test";
import assert from "node:assert/strict";

import { AniWorldClient } from "../src/index.js";

test("debug hook receives request lifecycle events", async () => {
  const events = [];
  const client = new AniWorldClient({
    debug(event) {
      events.push(event);
    },
    fetch: async () => new Response(JSON.stringify([]), {
      status: 200,
      headers: {
        "content-type": "application/json"
      }
    })
  });

  await client.search("test");

  assert.ok(events.some((event) => event.event === "request:start"));
  assert.ok(events.some((event) => event.event === "request:done"));
});

test("search returns Naruto results", async () => {
  const client = new AniWorldClient();
  const results = await client.search("naruto");

  assert.ok(results.length > 0);
  assert.equal(results[0].type, "anime");
  assert.ok(results.some((entry) => entry.slug === "naruto"));
});

test("getAnimeDetails returns One Piece metadata", async () => {
  const client = new AniWorldClient();
  const details = await client.getAnimeDetails("one-piece");

  assert.equal(details.slug, "one-piece");
  assert.equal(details.title, "One Piece");
  assert.ok(details.genres.length > 0);
  assert.ok(details.countries.length > 0);
  assert.ok(details.actors.length > 0);
  assert.ok(details.producers.length > 0);
  assert.ok(details.seasons.length > 0);
});

test("getAnimeDetails can localize wrapper labels to english", async () => {
  const client = new AniWorldClient({ responseLanguage: "en" });
  const details = await client.getAnimeDetails("one-piece");

  assert.equal(details.responseLanguage, "en");
  assert.equal(details.seasons[0].title, "Movies");
  assert.equal(details.seasons[1].title, "Season 1");
});

test("getEpisodes returns entries for a season", async () => {
  const client = new AniWorldClient();
  const result = await client.getEpisodes("one-piece", 1);

  assert.equal(result.season.number, 1);
  assert.ok(result.episodes.length > 0);
  assert.equal(result.episodes[0].number, 1);
  assert.ok(result.episodes[0].availableHosters.length > 0);
});

test("getEpisodes can localize season and language labels to english", async () => {
  const client = new AniWorldClient();
  const result = await client.getEpisodes("one-piece", 1, {
    responseLanguage: "en"
  });

  assert.equal(result.responseLanguage, "en");
  assert.equal(result.season.title, "Season 1");
  assert.ok(result.episodes[0].availableLanguages.includes("German"));
  assert.equal(result.episodes[0].displayTitle, result.episodes[0].originalTitle);
});

test("getEpisodeStreams returns languages and hosters", async () => {
  const client = new AniWorldClient();
  const result = await client.getEpisodeStreams("one-piece", 1, 1);

  assert.equal(result.episode.number, 1);
  assert.ok(result.languages.length >= 3);
  assert.ok(result.streams.some((stream) => stream.hoster === "VOE"));
});

test("getEpisodeStreams can localize labels to english", async () => {
  const client = new AniWorldClient();
  const result = await client.getEpisodeStreams("one-piece", 1, 1, {
    responseLanguage: "en"
  });

  assert.equal(result.responseLanguage, "en");
  assert.equal(result.languages[0].label, "German");
  assert.equal(result.episode.title, result.episode.englishTitle);
});

test("getEpisodeStreams can filter by language", async () => {
  const client = new AniWorldClient();
  const result = await client.getEpisodeStreams("one-piece", 1, 1, {
    language: "German",
    responseLanguage: "en"
  });

  assert.equal(result.selectedLanguage?.label, "German");
  assert.ok(result.streams.length > 0);
  assert.ok(result.streams.every((stream) => stream.language === "German"));
});

test("resolveRedirect returns the final hoster URL", async () => {
  const client = new AniWorldClient();
  const target = await client.resolveRedirect("/redirect/3779495");

  assert.match(target, /^https:\/\/voe\.sx\//);
});
