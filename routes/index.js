// routes/index.js
// const express = require("express");
// const router = express.Router();

// router.get("/", (req, res) => {
//   res.render("index", { title: "Select Game" });
// });

// module.exports = router;

const express = require("express");
const matchRepository = require("../services/matches/matchRepository");
const router = express.Router();

router.get("/", async (req, res) => {
  const playerSummary = await matchRepository.getPlayerSummary(req.playerId);
  res.render("index", {
    title: "$Play - Home",
    user: req.user || null,
    playerId: req.playerId,
    playerSummary,
  });
});

router.get("/chess", (req, res) => {
  res.render("games/chess", { title: "Play Chess" });
});

router.get("/tic-tac-toe", (req, res) => {
  res.render("games/ticTacToe", { title: "Play Tic-Tac-Toe" });
});

module.exports = router;
