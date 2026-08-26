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

router.get("/play", async (req, res) => {
  const [playerSummary, leaderboard, friends] = await Promise.all([
    matchRepository.getPlayerSummary(req.playerId),
    userRepository.getLeaderboard("chess", 5),
    userRepository.getFriends(req.playerId),
  ]);
  res.render("play", {
    title: "$Play",
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
    leaderboard,
    user: req.user || null,
  });
});

router.get("/chess", (req, res) => {
  res.render("games/chess", { title: "Play Chess" });
});

router.get("/tic-tac-toe", (req, res) => {
  res.render("games/ticTacToe", { title: "Play Tic-Tac-Toe" });
});

module.exports = router;
