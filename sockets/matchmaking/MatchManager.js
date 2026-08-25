const crypto = require("crypto");
const MATCH_STATUS = require("./matchStatus");

class MatchManager {
  constructor(store) {
    this.store = store || { matches: new Map() };
  }

  create({ game, players, state, settings = {}, metadata = {} }) {
    const id = crypto.randomUUID();
    const room = `match:${id}`;
    const match = {
      id,
      matchId: id,
      room,
      game,
      gameType: game,
      players: players.map((player) => ({
        playerId: player.playerId,
        socketId: player.socketId,
        side: player.side || null,
        connected: true,
        ready: false,
      })),
      settings,
      status: MATCH_STATUS.WAITING_READY,
      metadata,
      state,
      createdAt: Date.now(),
    };

    this.store.matches.set(id, match);
    return match;
  }

  getById(matchId) {
    return this.store.matches.get(matchId);
  }

  getByRoom(room) {
    return [...this.store.matches.values()].find((match) => match.room === room);
  }

  findByPlayer(playerId) {
    return [...this.store.matches.values()].find((match) =>
      match.players.some((player) => player.playerId === playerId)
    );
  }

  isPlayerInMatch(playerId) {
    return Boolean(this.findByPlayer(playerId));
  }

  updateSocket(match, playerId, socketId) {
    const player = this.getPlayer(match, playerId);
    if (!player) return;

    player.socketId = socketId;
    player.connected = true;
  }

  markDisconnected(match, playerId) {
    const player = this.getPlayer(match, playerId);
    if (player) player.connected = false;
  }

  remove(match) {
    this.store.matches.delete(match.id);
  }

  getPlayer(match, playerId) {
    return match.players.find((player) => player.playerId === playerId);
  }
}

module.exports = MatchManager;
