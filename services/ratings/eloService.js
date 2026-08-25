const DEFAULT_RATING = 1200;
const K_FACTOR = 32;

function getExpectedScore(playerRating, opponentRating) {
  return 1 / (1 + 10 ** ((opponentRating - playerRating) / 400));
}

function getActualScore(outcome) {
  if (outcome === "win") return 1;
  if (outcome === "loss") return 0;
  return 0.5;
}

function calculateElo(playerRating, opponentRating, outcome) {
  const expected = getExpectedScore(playerRating, opponentRating);
  const actual = getActualScore(outcome);
  return Math.round(playerRating + K_FACTOR * (actual - expected));
}

module.exports = {
  DEFAULT_RATING,
  calculateElo,
};
