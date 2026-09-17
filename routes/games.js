const express = require("express");
const { getGameCatalog } = require("../services/games/gameCatalog");
const { gameSchema, pageSeo } = require("../services/seo");
const router = express.Router();

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
