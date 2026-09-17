// routes/index.js
// const express = require("express");
// const router = express.Router();

// router.get("/", (req, res) => {
//   res.render("index", { title: "Select Game" });
// });

// module.exports = router;

const express = require("express");
const matchRepository = require("../services/matches/matchRepository");
const userRepository = require("../services/auth/userRepository");
const { getGameCatalog } = require("../services/games/gameCatalog");
const {
  faqSchema,
  gameSchema,
  organizationSchema,
  pageSeo,
  softwareApplicationSchema,
  websiteSchema,
} = require("../services/seo");
const router = express.Router();

router.get("/", async (req, res) => {
  const playerSummary = await matchRepository.getPlayerSummary(req.playerId);
  const liveGames = getGameCatalog().filter((game) => game.status === "live");
  res.render("index", {
    title: "$Play - Home",
    seo: pageSeo(req, {
      title: "$Play - Online Chess, Tic-Tac-Toe, Ratings, and Live Matchmaking",
      description:
        "Play live online chess and Tic-Tac-Toe on $Play with real-time matchmaking, chess clocks, Elo ratings, leaderboards, friends, rematches, and match history.",
      path: "/",
      schema: [
        organizationSchema(req),
        websiteSchema(req),
        softwareApplicationSchema(req),
        faqSchema(req),
        ...liveGames.map((game) => gameSchema(req, game)),
      ],
    }),
    user: req.user || null,
    playerId: req.playerId,
    playerSummary,
  });
});

router.get("/play", async (req, res) => {
  const [playerSummary, leaderboard, friends] = await Promise.all([
    matchRepository.getPlayerSummary(req.playerId),
    userRepository.getLeaderboard("chess", 5),
    userRepository.getFriends(req.playerId),
  ]);
  res.render("play", {
    title: "$Play",
    seo: pageSeo(req, {
      title: "$Play Lobby - Find Live Online Chess and Tic-Tac-Toe Matches",
      description:
        "Use the $Play lobby to find online chess and Tic-Tac-Toe matches, choose chess time controls, track active players, view ratings, add friends, and review recent matches.",
      path: "/play",
      schema: [softwareApplicationSchema(req), faqSchema(req)],
    }),
    user: req.user || null,
    playerId: req.playerId,
    playerSummary,
    games: getGameCatalog(),
    leaderboard,
    friends,
    friendMessage: req.query.friend || null,
  });
});

router.post("/friends", async (req, res) => {
  if (!req.user?.id) return res.redirect("/play");

  const friend = await userRepository.findByHandle(req.body.identifier);
  if (!friend) return res.redirect("/play?friend=not_found");

  const updated = await userRepository.addFriend(req.user.id, friend.id);
  if (!updated) return res.redirect("/play?friend=not_added");

  res.redirect("/play?friend=added");
});

router.get("/profile", async (req, res) => {
  const [playerSummary, friends] = await Promise.all([
    matchRepository.getPlayerSummary(req.playerId, 10),
    userRepository.getFriends(req.playerId),
  ]);

  res.render("profile", {
    title: "$Play - Profile",
    seo: pageSeo(req, {
      title: "$Play Profile - Chess Rating, Friends, and Match History",
      description:
        "View your $Play profile with chess rating, wins, losses, friends, and recent match history across live browser games.",
      path: "/profile",
      robots: "noindex,follow",
    }),
    user: req.user || null,
    playerId: req.playerId,
    playerSummary,
    friends,
  });
});

router.get("/leaderboards", async (req, res) => {
  const leaderboard = await userRepository.getLeaderboard("chess", 25);
  res.render("leaderboards", {
    title: "$Play - Leaderboards",
    seo: pageSeo(req, {
      title: "$Play Chess Leaderboard - Rated Online Chess Players",
      description:
        "See the $Play chess leaderboard for rated online chess players and compare Elo ratings from live browser matches.",
      path: "/leaderboards",
    }),
    leaderboard,
    user: req.user || null,
  });
});

router.get("/chess", (req, res) => {
  const game = getGameCatalog().find((entry) => entry.id === "chess");
  res.render("games/chess", {
    title: "Play Chess",
    seo: pageSeo(req, {
      title: "Play Chess Online - Live Rated Chess With Clocks and Matchmaking",
      description: game.description,
      path: "/game/chess",
      keywords: game.keywords,
      schema: [gameSchema(req, game)],
    }),
  });
});

router.get("/tic-tac-toe", (req, res) => {
  const game = getGameCatalog().find((entry) => entry.id === "tictactoe");
  res.render("games/ticTacToe", {
    title: "Play Tic-Tac-Toe",
    seo: pageSeo(req, {
      title: "Play Tic-Tac-Toe Online - Fast Browser Matchmaking",
      description: game.description,
      path: "/game/tic-tac-toe",
      keywords: game.keywords,
      schema: [gameSchema(req, game)],
    }),
  });
});

module.exports = router;
