const express = require("express");
const router = express.Router();

router.get("/chess", (req, res) => {
  res.render("games/chess", { title: "Play Chess" });
});

router.get("/tic-tac-toe", (req, res) => {
  res.render("games/ticTacToe", { title: "Play Tic-Tac-Toe" });
});

module.exports = router;
