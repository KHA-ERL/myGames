const { getGameCatalog } = require("./games/gameCatalog");

const SITE_NAME = "$Play";
const DEFAULT_DESCRIPTION =
  "$Play is a real-time browser game lobby for live online chess, Tic-Tac-Toe, ratings, leaderboards, friends, rematches, and match history.";

function trimTrailingSlash(value) {
  return String(value || "").replace(/\/+$/, "");
}

function getSiteUrl(req) {
  const configuredUrl = trimTrailingSlash(
    process.env.SITE_URL || process.env.APP_URL || ""
  );
  if (configuredUrl) return configuredUrl.split(",")[0].trim();

  const protocol = req?.headers?.["x-forwarded-proto"] || req?.protocol || "http";
  const host = req?.headers?.["x-forwarded-host"] || req?.headers?.host;
  return host ? `${protocol}://${host}` : "http://localhost:3000";
}

function absoluteUrl(req, path) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getSiteUrl(req)}${normalizedPath}`;
}

function pageSeo(req, overrides = {}) {
  const path = overrides.path || req.originalUrl.split("?")[0] || "/";
  const title = overrides.title || SITE_NAME;
  return {
    title,
    description: overrides.description || DEFAULT_DESCRIPTION,
    canonicalUrl: absoluteUrl(req, path),
    imageUrl: overrides.imageUrl || process.env.SITE_IMAGE_URL || "",
    keywords: overrides.keywords || [
      "online games",
      "play chess online",
      "multiplayer browser games",
      "tic tac toe online",
      "game leaderboard",
    ],
    robots:
      overrides.robots ||
      "index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1",
    type: overrides.type || "website",
    schema: overrides.schema || [],
  };
}

function safeJson(value) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

function organizationSchema(req) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: absoluteUrl(req, "/"),
  };
}

function websiteSchema(req) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: absoluteUrl(req, "/"),
    description: DEFAULT_DESCRIPTION,
  };
}

function softwareApplicationSchema(req) {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: SITE_NAME,
    applicationCategory: "GameApplication",
    operatingSystem: "Any",
    url: absoluteUrl(req, "/play"),
    description: DEFAULT_DESCRIPTION,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  };
}

function gameSchema(req, game) {
  return {
    "@context": "https://schema.org",
    "@type": "VideoGame",
    name: `${game.name} on ${SITE_NAME}`,
    url: absoluteUrl(req, game.href),
    description: game.description,
    gamePlatform: "Web browser",
    playMode: game.modes.includes("Rated") ? "MultiPlayer" : "MultiPlayer",
    applicationCategory: "GameApplication",
    genre: game.category,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  };
}

function faqSchema(req) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "What can I play on $Play?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "$Play currently supports live online chess and Tic-Tac-Toe, with 8-Ball Pool and Checkers listed as upcoming games.",
        },
      },
      {
        "@type": "Question",
        name: "Does $Play support chess ratings and leaderboards?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "$Play includes chess Elo ratings, player profiles, match history, rematches, and chess leaderboards.",
        },
      },
      {
        "@type": "Question",
        name: "Can I play $Play games in a browser?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "$Play games run in the browser with real-time matchmaking and server-authoritative multiplayer state.",
        },
      },
    ],
  };
}

function sitemapEntries(req) {
  const now = new Date().toISOString();
  const staticEntries = [
    { loc: absoluteUrl(req, "/"), priority: "1.0", changefreq: "daily" },
    { loc: absoluteUrl(req, "/play"), priority: "0.9", changefreq: "daily" },
    {
      loc: absoluteUrl(req, "/leaderboards"),
      priority: "0.7",
      changefreq: "daily",
    },
  ];
  const gameEntries = getGameCatalog()
    .filter((game) => game.status === "live")
    .map((game) => ({
      loc: absoluteUrl(req, game.href),
      priority: "0.8",
      changefreq: "daily",
    }));

  return [...staticEntries, ...gameEntries].map((entry) => ({
    ...entry,
    lastmod: now,
  }));
}

module.exports = {
  DEFAULT_DESCRIPTION,
  SITE_NAME,
  absoluteUrl,
  faqSchema,
  gameSchema,
  getSiteUrl,
  organizationSchema,
  pageSeo,
  safeJson,
  sitemapEntries,
  softwareApplicationSchema,
  websiteSchema,
};
