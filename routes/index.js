// routes/index.js
// const express = require("express");
// const router = express.Router();

// router.get("/", (req, res) => {
//   res.render("index", { title: "Select Game" });
// });

// module.exports = router;

const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
  res.render("index", { title: "$Play - Home" });
});

router.get("/chess", (req, res) => {
  res.render("games/chess", { title: "Play Chess" });
});

module.exports = router;
