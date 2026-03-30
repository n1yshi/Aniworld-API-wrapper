# AniWorld Wrapper

A clean, modular Node.js wrapper for AniWorld with:

- anime search
- anime details
- season and episode lists
- stream host lists
- optional redirect resolution
- optional language filtering
- a simple black demo web app

## Install

```bash
npm install
```

After publishing to npm, people will be able to install it like this:

```bash
npm install aniworld-wrapper
```

## Run the Demo

```bash
npm run demo
```

Open:

```text
http://127.0.0.1:3030
```

The demo includes:

- English UI text
- old-black centered layout
- anime search
- anime details
- season selection
- episode selection
- stream selection
- iframe playback attempt
- fallback link to open the current stream directly

Demo files:

```text
demo/
  server.js
  public/
    index.html
    styles.css
    app.js
```

## What the Wrapper Can Do

The wrapper exports `AniWorldClient`.

Main methods:

- `search(query)`
- `getAnimeDetails(slug)`
- `getEpisodes(slug, season)`
- `getEpisodeStreams(slug, season, episode, options)`
- `resolveRedirect(url)`

## Publish Checklist

Before publishing:

- run `npm test`
- check the package name you want on npm
- update the version in `package.json`
- add your final GitHub repository URL to `package.json` later if you want
- publish with `npm publish`

## Quick Start

```js
import { AniWorldClient } from "aniworld-wrapper";

const client = new AniWorldClient();

const results = await client.search("naruto");
console.log(results[0]);

const details = await client.getAnimeDetails("one-piece");
console.log(details.title);

const episodes = await client.getEpisodes("one-piece", 1);
console.log(episodes.episodes[0]);

const streams = await client.getEpisodeStreams("one-piece", 1, 1, {
  resolveRedirects: true
});
console.log(streams.streams);
```

## Constructor

```js
const client = new AniWorldClient(options);
```

Available options:

- `baseUrl`: defaults to `https://aniworld.to`
- `headers`: extra request headers
- `fetch`: custom fetch implementation
- `debug`: `true` or a callback for request lifecycle logging
- `responseLanguage`: `"source"` or `"en"`

Debug example:

```js
const client = new AniWorldClient({
  responseLanguage: "en",
  debug(entry) {
    console.log(entry.event, entry.method, entry.url, entry.status ?? "");
  }
});
```

## `search(query)`

Searches AniWorld through its AJAX search endpoint.

```js
const results = await client.search("bleach");
```

Returns entries like:

```json
{
  "title": "Bleach",
  "description": "Ichigo Kurosaki...",
  "link": "https://aniworld.to/anime/stream/bleach",
  "path": "/anime/stream/bleach",
  "slug": "bleach",
  "type": "anime"
}
```

Possible `type` values:

- `anime`
- `episode`
- `support`

## `getAnimeDetails(slug)`

Loads the main anime page and parses metadata.

```js
const details = await client.getAnimeDetails("one-piece");
```

You can localize wrapper-controlled labels:

```js
const details = await client.getAnimeDetails("one-piece", {
  responseLanguage: "en"
});
```

Returns fields such as:

- `slug`
- `title`
- `alternativeTitles`
- `years`
- `ageRating`
- `imdbId`
- `description`
- `cover`
- `backdrop`
- `genres`
- `countries`
- `directors`
- `actors`
- `producers`
- `seasons`
- `seriesId`

Example:

```json
{
  "slug": "one-piece",
  "title": "One Piece",
  "genres": ["Fighting-Shounen", "Abenteuer", "Action"],
  "ageRating": "16",
  "imdbId": "tt0388629"
}
```

## `getEpisodes(slug, season)`

Loads the episode list for a season or the movie page.

```js
const result = await client.getEpisodes("one-piece", 1);
```

English-localized wrapper labels:

```js
const result = await client.getEpisodes("one-piece", 1, {
  responseLanguage: "en"
});
```

`season` can be:

- `1`
- `2`
- `"staffel-1"`
- `"filme"`

Returns:

- `season`
- `episodes`

Episode entries include:

- `id`
- `seasonEpisodeId`
- `number`
- `title`
- `originalTitle`
- `path`
- `url`
- `availableHosters`
- `availableLanguages`

Example:

```json
{
  "number": 1,
  "title": "Hier kommt Ruffy, der künftige König der Piraten!",
  "availableHosters": ["VOE", "Filemoon", "Vidmoly", "Doodstream"],
  "availableLanguages": ["Deutsch", "Deutsch mit Untertiteln", "Englisch mit Untertiteln"]
}
```

## `getEpisodeStreams(slug, season, episode, options)`

Loads the stream list for a single episode.

```js
const result = await client.getEpisodeStreams("one-piece", 1, 1);
```

Basic return shape:

- `season`
- `episode`
- `languages`
- `streams`
- `selectedLanguage`

### Language Support

Yes, the returned JSON includes the language for each stream.

Example stream entry:

```json
{
  "id": 3779495,
  "hoster": "VOE",
  "languageKey": "1",
  "language": "Deutsch",
  "redirectPath": "/redirect/3779495",
  "redirectUrl": "https://aniworld.to/redirect/3779495",
  "isExternalEmbed": false
}
```

### Filter by Language

You can request a specific language.

By label:

```js
const germanOnly = await client.getEpisodeStreams("one-piece", 1, 1, {
  language: "German",
  responseLanguage: "en"
});
```

By AniWorld language key:

```js
const germanOnly = await client.getEpisodeStreams("one-piece", 1, 1, {
  languageKey: "1"
});
```

Common language keys:

- `"1"` = `Deutsch`
- `"2"` = `Englisch mit Untertiteln`
- `"3"` = `Deutsch mit Untertiteln`

When a language filter is used:

- `streams` only contains matching streams
- `languages` is reduced to the selected language
- `selectedLanguage` is set

Example:

```json
{
  "selectedLanguage": {
    "key": "1",
    "label": "Deutsch"
  },
  "streams": [
    {
      "hoster": "VOE",
      "language": "Deutsch"
    }
  ]
}
```

### Response Language

You can ask the wrapper to localize its own labels to English:

```js
const result = await client.getEpisodeStreams("one-piece", 1, 1, {
  responseLanguage: "en"
});
```

This affects wrapper-controlled values such as:

- season titles: `Season 1`, `Movies`
- stream language labels: `German`, `English with subtitles`
- preferred episode title field when an English title exists

Example:

```json
{
  "responseLanguage": "en",
  "episode": {
    "title": "I'm Luffy! The Man Who Will Become the Pirate King! [Episode 001]"
  },
  "languages": [
    {
      "key": "1",
      "label": "German"
    }
  ]
}
```

### Resolve Redirects

If you pass `resolveRedirects: true`, each stream also gets `targetUrl`.

```js
const result = await client.getEpisodeStreams("one-piece", 1, 1, {
  resolveRedirects: true
});
```

Example:

```json
{
  "hoster": "VOE",
  "language": "Deutsch",
  "redirectUrl": "https://aniworld.to/redirect/3779495",
  "targetUrl": "https://voe.sx/e/yz4e7onadtqb"
}
```

## Important Stream URL Note

`targetUrl` is currently the resolved hoster URL.

That usually means:

- a hoster page URL
- or a hoster embed URL

It is not guaranteed to be:

- a direct `.mp4` URL
- a direct `.m3u8` URL
- a fully extracted raw media file

So if you want a real direct media URL for a custom video player, that is not implemented yet.

Current status:

- `redirectUrl`: AniWorld redirect URL
- `targetUrl`: resolved hoster URL
- direct extracted video file URL: not implemented yet

## `resolveRedirect(url)`

Resolves an AniWorld redirect manually.

```js
const url = await client.resolveRedirect("/redirect/3779495");
console.log(url);
```

## Demo API Routes

The demo server exposes a small JSON API:

- `GET /api/search?q=naruto`
- `GET /api/anime/:slug/details`
- `GET /api/anime/:slug/episodes?season=1`
- `GET /api/anime/:slug/streams?season=1&episode=1&resolveRedirects=true`

## Project Structure

```text
src/
  client.js
  http-client.js
  errors.js
  constants.js
  debug.js
  parsers/
    anime-details.js
    episodes.js
    search.js
    shared.js
    streams.js
  utils/
    inputs.js
    text.js
    url.js
```

## Notes

- AniWorld may change its HTML at any time.
- The wrapper is parser-based, not tied to unofficial internal page variables.
- Some hosters may block iframe embedding.
- In the demo, use the fallback open link if the iframe does not work.
- `responseLanguage: "en"` localizes wrapper-generated labels, not full AniWorld source descriptions.
