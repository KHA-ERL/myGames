const express = require("express");
const router = express.Router();

router.get("/chess/:gameId", (req, res) => {
  res.render("games/chess", { title: "Play Chess" });
});
// router.get("/checkers/:gameId", (req, res) => {
//   const gameId = req.params.gameId;
//   res.render("games/checkers", { gameId, title: "Play Checkers" });
// });

router.get("/checkers/:gameId", (req, res) => {
  res.render("games/checkers", { title: "Play Checkers", gameId: req.params.gameId });
});

// router.get("/checkers", (req, res) => {
//   res.render("games/checkers", { title: "Play Checkers" });
// });


module.exports = router;
