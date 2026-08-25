const express = require("express");
const passport = require("passport");

const router = express.Router();

function ensureStrategy(name, res) {
  if (passport._strategy(name)) return true;

  res.status(503).send(`${name} login is not configured.`);
  return false;
}

router.get("/google", (req, res, next) => {
  if (!ensureStrategy("google", res)) return;
  passport.authenticate("google", { scope: ["profile", "email"] })(
    req,
    res,
    next
  );
});

router.get(
  "/google/callback",
  (req, res, next) => {
    if (!ensureStrategy("google", res)) return;
    passport.authenticate("google", {
      failureRedirect: "/",
      successRedirect: "/",
    })(req, res, next);
  }
);

router.get("/apple", (req, res, next) => {
  if (!ensureStrategy("apple", res)) return;
  passport.authenticate("apple")(req, res, next);
});

router.post("/apple/callback", (req, res, next) => {
  if (!ensureStrategy("apple", res)) return;
  passport.authenticate("apple", {
    failureRedirect: "/",
    successRedirect: "/",
  })(req, res, next);
});

router.post("/logout", (req, res, next) => {
  req.logout((error) => {
    if (error) return next(error);
    res.redirect("/");
  });
});

module.exports = router;
