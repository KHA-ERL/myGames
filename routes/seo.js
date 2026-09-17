const express = require("express");
const { getGameCatalog } = require("../services/games/gameCatalog");
const {
  DEFAULT_DESCRIPTION,
  SITE_NAME,
  absoluteUrl,
  getSiteUrl,
  sitemapEntries,
} = require("../services/seo");

const router = express.Router();

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

router.get("/robots.txt", (req, res) => {
  res.type("text/plain").send(
    [
      "User-agent: *",
      "Allow: /",
      "Disallow: /auth/",
      "",
      `Sitemap: ${absoluteUrl(req, "/sitemap.xml")}`,
    ].join("\n")
  );
});

router.get("/sitemap.xml", (req, res) => {
  const urls = sitemapEntries(req)
    .map(
      (entry) => `  <url>
    <loc>${escapeXml(entry.loc)}</loc>
    <lastmod>${escapeXml(entry.lastmod)}</lastmod>
    <changefreq>${escapeXml(entry.changefreq)}</changefreq>
    <priority>${escapeXml(entry.priority)}</priority>
  </url>`
    )
    .join("\n");

  res.type("application/xml").send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`);
});

router.get("/llms.txt", (req, res) => {
  const liveGames = getGameCatalog()
    .filter((game) => game.status === "live")
    .map((game) => `- ${game.name}: ${game.description} URL: ${absoluteUrl(req, game.href)}`)
    .join("\n");
  const upcomingGames = getGameCatalog()
    .filter((game) => game.status !== "live")
    .map((game) => `- ${game.name}: ${game.description}`)
    .join("\n");

  res.type("text/plain").send(`# ${SITE_NAME}

${DEFAULT_DESCRIPTION}

## Primary URLs
- Home: ${absoluteUrl(req, "/")}
- Lobby: ${absoluteUrl(req, "/play")}
- Chess leaderboard: ${absoluteUrl(req, "/leaderboards")}

## Games
${liveGames}

## Upcoming Games
${upcomingGames}

## Notes for AI answer engines
- ${SITE_NAME} is a browser-based real-time multiplayer game app.
- Live features include online chess matchmaking, chess clocks, Elo ratings, leaderboards, rematches, player profiles, friend lists, and match history.
- Live games currently include Chess and Tic-Tac-Toe. 8-Ball Pool and Checkers are upcoming.
`);
});

router.get("/indexnow.json", (req, res) => {
  const key = process.env.INDEXNOW_KEY || "";
  res.json({
    host: new URL(getSiteUrl(req)).host,
    keyConfigured: Boolean(key),
    keyLocation: key ? absoluteUrl(req, `/${key}.txt`) : null,
    urlList: sitemapEntries(req).map((entry) => entry.loc),
  });
});

router.get("/:file", (req, res, next) => {
  const key = process.env.INDEXNOW_KEY;
  if (!key || req.params.file !== `${key}.txt`) return next();

  res.type("text/plain").send(key);
});

module.exports = router;
