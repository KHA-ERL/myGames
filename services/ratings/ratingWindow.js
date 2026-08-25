const RATING_WINDOWS = [100, 200, Infinity];

function getRatingWindow(waitMs = 0) {
  if (waitMs >= 30000) return RATING_WINDOWS[2];
  if (waitMs >= 15000) return RATING_WINDOWS[1];
  return RATING_WINDOWS[0];
}

function isWithinRatingWindow(a, b, waitMs = 0) {
  const window = getRatingWindow(waitMs);
  if (window === Infinity) return true;
  return Math.abs(Number(a || 0) - Number(b || 0)) <= window;
}

module.exports = {
  RATING_WINDOWS,
  getRatingWindow,
  isWithinRatingWindow,
};
