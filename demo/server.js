import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { AniWorldClient } from "../src/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, "public");

const client = new AniWorldClient();
const port = Number(process.env.PORT || 3030);
const host = process.env.HOST || "127.0.0.1";

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

    if (url.pathname.startsWith("/api/")) {
      await handleApi(url, res);
      return;
    }

    await serveStatic(url.pathname, res);
  } catch (error) {
    sendJson(res, 500, {
      error: error?.message ?? "Unexpected server error."
    });
  }
});

server.listen(port, host, () => {
  console.log(`AniWorld demo running at http://${host}:${port}`);
});

async function handleApi(url, res) {
  if (url.pathname === "/api/search") {
    const query = url.searchParams.get("q")?.trim();
    if (!query) {
      sendJson(res, 400, { error: 'Missing "q" query parameter.' });
      return;
    }

    const results = await client.search(query);
    sendJson(res, 200, { results });
    return;
  }

  const detailsMatch = url.pathname.match(/^\/api\/anime\/([^/]+)\/details$/);
  if (detailsMatch) {
    const details = await client.getAnimeDetails(detailsMatch[1]);
    sendJson(res, 200, details);
    return;
  }

  const episodesMatch = url.pathname.match(/^\/api\/anime\/([^/]+)\/episodes$/);
  if (episodesMatch) {
    const season = url.searchParams.get("season") || "1";
    const episodes = await client.getEpisodes(episodesMatch[1], season);
    sendJson(res, 200, episodes);
    return;
  }

  const streamsMatch = url.pathname.match(/^\/api\/anime\/([^/]+)\/streams$/);
  if (streamsMatch) {
    const season = url.searchParams.get("season") || "1";
    const episode = Number(url.searchParams.get("episode") || "1");
    const resolveRedirects = url.searchParams.get("resolveRedirects") !== "false";
    const streams = await client.getEpisodeStreams(streamsMatch[1], season, episode, {
      resolveRedirects
    });
    sendJson(res, 200, streams);
    return;
  }

  sendJson(res, 404, { error: "API route not found." });
}

async function serveStatic(pathname, res) {
  const safePath = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.join(publicDir, safePath);

  if (!filePath.startsWith(publicDir)) {
    sendText(res, 403, "Forbidden");
    return;
  }

  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) {
      sendText(res, 404, "Not found");
      return;
    }
  } catch {
    sendText(res, 404, "Not found");
    return;
  }

  res.writeHead(200, {
    "content-type": getContentType(filePath)
  });

  createReadStream(filePath).pipe(res);
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8"
  });
  res.end(JSON.stringify(payload));
}

function sendText(res, status, text) {
  res.writeHead(status, {
    "content-type": "text/plain; charset=utf-8"
  });
  res.end(text);
}

function getContentType(filePath) {
  if (filePath.endsWith(".html")) {
    return "text/html; charset=utf-8";
  }
  if (filePath.endsWith(".css")) {
    return "text/css; charset=utf-8";
  }
  if (filePath.endsWith(".js")) {
    return "application/javascript; charset=utf-8";
  }
  if (filePath.endsWith(".json")) {
    return "application/json; charset=utf-8";
  }
  return "application/octet-stream";
}
