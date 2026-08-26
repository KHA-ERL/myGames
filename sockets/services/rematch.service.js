const DEFAULT_REMATCH_TIMEOUT_MS = 60000;

class RematchService {
  constructor(timeoutMs = Number(process.env.REMATCH_TIMEOUT_MS || DEFAULT_REMATCH_TIMEOUT_MS)) {
    this.timeoutMs = timeoutMs;
    this.offers = new Map();
    this.playerOffers = new Map();
  }

  createOffer(match, result, reason) {
    const offer = {
      originalMatchId: match.id,
      game: match.game,
      players: match.players.map((player) => ({
        playerId: player.playerId,
        socketId: player.socketId,
        side: player.side,
        rating: player.rating,
      })),
      settings: { ...match.settings },
      result,
      reason,
      requested: new Set(),
      createdAt: Date.now(),
      expiresAt: Date.now() + this.timeoutMs,
      timeout: setTimeout(() => this.clearOffer(match.id), this.timeoutMs),
    };

    this.offers.set(match.id, offer);
    offer.players.forEach((player) => {
      this.playerOffers.set(player.playerId, match.id);
    });

    return offer;
  }

  request(originalMatchId, playerId, socketId) {
    const offer = this.offers.get(originalMatchId);
    if (!offer || offer.expiresAt <= Date.now()) return null;

    const player = offer.players.find((entry) => entry.playerId === playerId);
    if (!player) return null;

    player.socketId = socketId;
    offer.requested.add(playerId);
    return offer;
  }

  getByPlayer(playerId) {
    const offerId = this.playerOffers.get(playerId);
    return offerId ? this.offers.get(offerId) : null;
  }

  isAccepted(offer) {
    return offer.players.every((player) => offer.requested.has(player.playerId));
  }

  clearOffer(originalMatchId) {
    const offer = this.offers.get(originalMatchId);
    if (!offer) return;

    if (offer.timeout) clearTimeout(offer.timeout);
    offer.players.forEach((player) => this.playerOffers.delete(player.playerId));
    this.offers.delete(originalMatchId);
  }
}

module.exports = RematchService;
