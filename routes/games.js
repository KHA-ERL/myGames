const express = require("express");
const router = express.Router();

router.get("/chess", (req, res) => {
  res.render("games/chess", { title: "Play Chess" });
});

module.exports = router;
