class WagerService {
  validateMatchmakingWager({ playerId, requestedWager }) {
    const wager = Number(requestedWager || 0);

    if (!playerId) {
      return { ok: false, code: "missing_player", message: "Player is required." };
    }

    if (!Number.isFinite(wager) || wager < 0) {
      return {
        ok: false,
        code: "invalid_wager",
        message: "Invalid wager amount.",
      };
    }

    if (wager !== 0) {
      return {
        ok: false,
        code: "wagers_disabled",
        message: "Wagered matches are not enabled yet.",
      };
    }

    return { ok: true, wager: 0 };
  }
}

module.exports = WagerService;
