const QueueManager = require("./QueueManager");
const MatchManager = require("./MatchManager");
const MATCH_STATUS = require("./matchStatus");
const InMemoryStore = require("./InMemoryStore");
const { validateGameAdapter } = require("../games/gameAdapter");
const ReconnectService = require("../services/reconnect.service");
const WagerService = require("../services/wager.service");
const RematchService = require("../services/rematch.service");
const matchRepository = require("../../services/matches/matchRepository");
const userRepository = require("../../services/auth/userRepository");
const { DEFAULT_RATING } = require("../../services/ratings/eloService");
const { getRatingWindow } = require("../../services/ratings/ratingWindow");

const DEFAULT_READY_TIMEOUT_MS = 30000;

class MatchmakingService {
  constructor(io) {
    this.io = io;
    this.store = new InMemoryStore();
    this.queueManager = new QueueManager(this.store);
    this.matchManager = new MatchManager(this.store);
    this.reconnectService = new ReconnectService();
    this.wagerService = new WagerService();
    this.rematchService = new RematchService();
    this.matchRepository = matchRepository;
    this.games = new Map();
  }

  registerGame(adapter) {
    validateGameAdapter(adapter);
    this.games.set(adapter.gameType, adapter);
  }

  handleConnection(socket) {
    const playerId = socket.data.player.playerId;

    socket.on("matchmaking:join", (payload) => {
      this.join(socket, payload).catch((error) => {
        console.error("Matchmaking join failed:", error);
        socket.emit("matchmaking:error", {
          code: "join_failed",
          message: "Could not join matchmaking.",
        });
      });
    });

    socket.on("lobby:subscribe", () => {
      socket.join("lobby");
      this.emitLobbyState();
    });

    socket.on("matchmaking:cancel", () => {
      this.queueManager.cancel(playerId);
      socket.emit("matchmaking:cancelled");
      this.emitLobbyState();
    });

    socket.on("game:ready", ({ matchId }) => {
      const match = this.matchManager.getById(matchId);
      if (!match) return;

      const player = this.matchManager.getPlayer(match, playerId);
      if (!player) return;

      player.ready = true;
      this.io.to(match.room).emit("game:ready-status", this.getMatchPayload(match));
      const allReady = match.players.every((matchPlayer) => matchPlayer.ready);
      if (allReady && match.status === MATCH_STATUS.WAITING_READY) {
        match.status = MATCH_STATUS.PLAYING;
        match.startedAt = Date.now();
        if (match.readyTimeout) {
          clearTimeout(match.readyTimeout);
          delete match.readyTimeout;
        }
        this.io.to(match.room).emit("game:start", this.getMatchPayload(match));
        const adapter = this.games.get(match.game);
        adapter?.startMatch(this.io, match, this);
      }
    });

    socket.on("game:rematch-request", ({ matchId }) => {
      this.requestRematch(socket, matchId);
    });

    socket.on("game:action", (payload) => {
      this.handleAction(socket, payload);
    });

    socket.on("reconnectGame", ({ room } = {}) => {
      this.reconnect(socket, room);
    });

    socket.on("disconnect", () => {
      this.disconnect(socket);
    });

    for (const adapter of this.games.values()) {
      adapter.registerSocket?.(this, socket);
    }
  }

  async join(socket, payload) {
    const adapter = this.games.get(payload?.gameType);
    if (!adapter) return;
    const playerId = socket.data.player?.playerId;
    if (!playerId) return;

    if (this.matchManager.isPlayerInMatch(playerId)) {
      socket.emit("matchmaking:error", {
        code: "already_playing",
        message: "Player is already in a match.",
      });
      return;
    }

    const user = await userRepository.findById(playerId);
    const player = {
      playerId,
      socketId: socket.id,
      connected: true,
      rating: user?.ratings?.[adapter.gameType] || DEFAULT_RATING,
    };
    const params = adapter.getMatchmakingParams
      ? adapter.getMatchmakingParams(payload)
      : null;
    if (!params) return;

    const wagerValidation = this.wagerService.validateMatchmakingWager({
      playerId,
      requestedWager: params.wager,
    });
    if (!wagerValidation.ok) {
      socket.emit("matchmaking:error", {
        code: wagerValidation.code,
        message: wagerValidation.message,
      });
      return;
    }
    params.wager = wagerValidation.wager;

    const queueKey = this.queueManager.getQueueKey(params);
    params.ratingWindow = getRatingWindow(0);

    const result = this.queueManager.join({
      queueKey,
      player,
      isMatchable: (opponent) => {
        return Boolean(this.io.sockets.sockets.get(opponent.socketId));
      },
    });

    if (result.status === "waiting") {
      socket.emit("matchmaking:waiting", {
        gameType: adapter.gameType,
        queueKey,
      params,
      player,
    });
      adapter.onWaiting?.(socket, payload);
      this.emitLobbyState();
      return;
    }

    const setup = adapter.createMatch(result.players, payload);
    const match = this.matchManager.create({
      game: adapter.gameType,
      players: setup.players || result.players,
      state: setup.state,
      settings: setup.settings,
      metadata: {
        ...setup.metadata,
        queueKey,
      },
    });
    adapter.createGame(match);

    match.players.forEach((matchedPlayer) => {
      const matchedSocket = this.io.sockets.sockets.get(matchedPlayer.socketId);
      if (matchedSocket) matchedSocket.join(match.room);
    });

    this.io.to(match.room).emit("matchmaking:matched", this.getMatchPayload(match));
    adapter.onMatchCreated?.(this.io, match, this);
    this.startReadyTimeout(match);
    this.emitLobbyState();
  }

  handleAction(socket, payload) {
    const match = this.matchManager.getById(payload?.matchId);
    if (!match || !this.matchManager.getPlayer(match, socket.data.player.playerId)) {
      return;
    }
    if (match.status !== MATCH_STATUS.PLAYING) return;

    const adapter = this.games.get(match.game);
    adapter?.handleAction(match, socket.data.player.playerId, payload?.action || payload?.move, {
      io: this.io,
      service: this,
    });
  }

  reconnect(socket, room) {
    const match = room
      ? this.matchManager.getByRoom(room)
      : this.matchManager.findByPlayer(socket.data.player.playerId);
    const playerId = socket.data.player.playerId;
    if (!match || !this.matchManager.getPlayer(match, playerId)) return;

    this.reconnectService.clear(match, playerId);
    this.matchManager.updateSocket(match, playerId, socket.id);
    if (
      match.status === MATCH_STATUS.PAUSED &&
      match.previousStatus === MATCH_STATUS.PLAYING &&
      match.players.every((player) => player.connected)
    ) {
      match.status = MATCH_STATUS.PLAYING;
      delete match.previousStatus;
      const adapter = this.games.get(match.game);
      adapter?.resume?.(this.io, match, this);
    }

    socket.join(match.room);
    socket.emit("player:reconnected", this.getMatchPayload(match));
    socket.emit("matchmaking:matched", this.getMatchPayload(match));

    const adapter = this.games.get(match.game);
    adapter?.reconnect(this.io, match, socket, this);
  }

  disconnect(socket) {
    const playerId = socket.data.player.playerId;
    this.queueManager.cancel(playerId);
    this.emitLobbyState();

    const match = this.matchManager.findByPlayer(playerId);
    if (!match) return;

    this.matchManager.markDisconnected(match, playerId);
    this.io.to(match.room).emit("player:disconnected", {
      matchId: match.matchId,
      room: match.room,
      playerId,
    });

    if (match.status === MATCH_STATUS.PLAYING) {
      match.previousStatus = MATCH_STATUS.PLAYING;
      match.status = MATCH_STATUS.PAUSED;
      const adapter = this.games.get(match.game);
      adapter?.pause?.(this.io, match, this);
    }

    this.reconnectService.start(match, playerId, () => {
      const currentMatch = this.matchManager.getById(match.id);
      const player = currentMatch
        ? this.matchManager.getPlayer(currentMatch, playerId)
        : null;
      if (!currentMatch || player?.connected) return;

      const adapter = this.games.get(currentMatch.game);
      const result = adapter?.getDisconnectResult?.(currentMatch, playerId) || null;
      this.finish(
        currentMatch,
        result?.reason || "Opponent disconnected.",
        result
      );
    });
  }

  finish(match, reason, result = null) {
    if (
      match.status === MATCH_STATUS.FINISHED ||
      match.status === MATCH_STATUS.CANCELLED
    ) {
      return;
    }

    match.status = MATCH_STATUS.FINISHED;
    this.rematchService.createOffer(match, result, reason);
    this.io.to(match.room).emit("game:finished", {
      matchId: match.id,
      room: match.room,
      reason,
      result,
    });

    this.cleanupMatch(match);
    this.matchRepository.recordResult(match, result).catch((error) => {
      console.error("Failed to record match result:", error);
    });
    this.matchManager.remove(match);
    this.emitLobbyState();
  }

  requestRematch(socket, matchId) {
    const playerId = socket.data.player.playerId;
    const offer =
      this.rematchService.request(matchId, playerId, socket.id) ||
      this.rematchService.request(
        this.rematchService.getByPlayer(playerId)?.originalMatchId,
        playerId,
        socket.id
      );

    if (!offer) {
      socket.emit("game:rematch-error", {
        code: "rematch_unavailable",
        message: "Rematch is no longer available.",
      });
      return;
    }

    offer.players.forEach((player) => {
      const playerSocket = this.io.sockets.sockets.get(player.socketId);
      playerSocket?.emit("game:rematch-status", {
        matchId: offer.originalMatchId,
        requested: [...offer.requested],
        needed: offer.players.map((entry) => entry.playerId),
      });
    });

    if (!this.rematchService.isAccepted(offer)) return;

    const adapter = this.games.get(offer.game);
    if (!adapter) return;

    const players = offer.players
      .map((player) => ({
        ...player,
        connected: true,
        ready: false,
      }))
      .filter((player) => this.io.sockets.sockets.get(player.socketId));

    if (
      players.length !== 2 ||
      players.some((player) => this.matchManager.isPlayerInMatch(player.playerId))
    ) {
      return;
    }

    const setup = adapter.createRematch
      ? adapter.createRematch(players, offer)
      : adapter.createMatch(players, {
          gameType: offer.game,
          timeControl: offer.settings.timeControl,
          wager: offer.settings.wager,
        });
    const match = this.matchManager.create({
      game: adapter.gameType,
      players: setup.players || players,
      state: setup.state,
      settings: setup.settings,
      metadata: {
        ...setup.metadata,
        rematchOf: offer.originalMatchId,
      },
    });

    adapter.createGame(match);
    match.players.forEach((matchedPlayer) => {
      const matchedSocket = this.io.sockets.sockets.get(matchedPlayer.socketId);
      if (matchedSocket) matchedSocket.join(match.room);
    });

    this.rematchService.clearOffer(offer.originalMatchId);
    this.io.to(match.room).emit("matchmaking:matched", this.getMatchPayload(match));
    adapter.onMatchCreated?.(this.io, match, this);
    this.startReadyTimeout(match);
    this.emitLobbyState();
  }

  cancel(match, reason) {
    if (
      match.status === MATCH_STATUS.FINISHED ||
      match.status === MATCH_STATUS.CANCELLED
    ) {
      return;
    }

    match.status = MATCH_STATUS.CANCELLED;
    this.io.to(match.room).emit("game:finished", {
      matchId: match.id,
      room: match.room,
      reason,
      status: match.status,
    });

    this.cleanupMatch(match);
    this.matchManager.remove(match);
    this.emitLobbyState();
  }

  cleanupMatch(match) {
    if (match.readyTimeout) {
      clearTimeout(match.readyTimeout);
      delete match.readyTimeout;
    }

    this.reconnectService.clearAll(match);
    match.players.forEach((player) => this.queueManager.cancel(player.playerId));

    const adapter = this.games.get(match.game);
    adapter?.cleanup?.(this.io, match, this);
  }

  startReadyTimeout(match) {
    match.readyTimeout = setTimeout(() => {
      if (match.status !== MATCH_STATUS.WAITING_READY) return;
      this.cancel(match, "Ready timeout. Match cancelled.");
    }, Number(process.env.MATCH_READY_TIMEOUT_MS || DEFAULT_READY_TIMEOUT_MS));
  }

  getMatchPayload(match) {
    return {
      matchId: match.matchId,
      id: match.id,
      room: match.room,
      gameType: match.game,
      game: match.game,
      players: match.players,
      settings: match.settings,
      status: match.status,
      metadata: match.metadata,
    };
  }

  getLobbySnapshot() {
    const queueSnapshot = this.queueManager.getSnapshot();
    const matchSnapshot = this.matchManager.getSnapshot();
    const games = {};

    for (const gameType of this.games.keys()) {
      games[gameType] = {
        queuedPlayers: 0,
        activeMatches: matchSnapshot.games[gameType]?.activeMatches || 0,
      };
    }

    for (const [queueKey, count] of Object.entries(queueSnapshot.queues)) {
      const gameType = queueKey.split(":")[0];
      games[gameType] = games[gameType] || { queuedPlayers: 0, activeMatches: 0 };
      games[gameType].queuedPlayers += count;
    }

    return {
      onlinePlayers: this.io.sockets.sockets.size,
      queuedPlayers: queueSnapshot.queuedPlayers,
      activeMatches: matchSnapshot.activeMatches,
      games,
    };
  }

  emitLobbyState() {
    this.io.to("lobby").emit("lobby:state", this.getLobbySnapshot());
  }
}

module.exports = MatchmakingService;
