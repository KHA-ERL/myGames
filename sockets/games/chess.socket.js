const { Chess } = require("chess.js");
const MATCH_STATUS = require("../matchmaking/matchStatus");
const TimerService = require("../services/timer.service");

const timer = new TimerService();
const CLOCK_TICK_MS = 1000;

function getRolePlayer(match, role) {
  return match.players.find((player) => player.side === role)?.playerId;
}

function leavePlayers(io, match) {
  match.players.forEach((player) => {
    const socket = io.sockets.sockets.get(player.socketId);
    if (socket) socket.leave(match.room);
  });
}

const OPENING_ACTIONS_REQUIRED = 2;
const DEFAULT_OPENING_ACTION_TIMEOUT_MS = 10000;

function createClock(timeControl) {
  const remainingMs = timeControl * 1000;
  return {
    whiteRemaining: remainingMs,
    blackRemaining: remainingMs,
    activePlayer: "w",
    turnStartedAt: null,
  };
}

function getRemainingMs(match) {
  const clock = match.state.clock;
  const remaining = {
    w: clock.whiteRemaining,
    b: clock.blackRemaining,
  };

  if (match.status === MATCH_STATUS.PLAYING && clock.turnStartedAt) {
    const elapsed = Date.now() - clock.turnStartedAt;
    remaining[clock.activePlayer] = Math.max(
      0,
      remaining[clock.activePlayer] - elapsed
    );
  }

  return remaining;
}

function getRemainingSeconds(match) {
  const remaining = getRemainingMs(match);
  return {
    w: Math.ceil(remaining.w / 1000),
    b: Math.ceil(remaining.b / 1000),
  };
}

function commitClock(match) {
  const remaining = getRemainingMs(match);
  match.state.clock.whiteRemaining = remaining.w;
  match.state.clock.blackRemaining = remaining.b;
  match.state.clock.turnStartedAt = Date.now();
}

function pauseClock(match) {
  if (!match.state.clock.turnStartedAt) return;

  commitClock(match);
  match.state.clock.turnStartedAt = null;
}

function getExpiredSide(match) {
  const remaining = getRemainingMs(match);
  if (remaining.w <= 0) return "w";
  if (remaining.b <= 0) return "b";
  return null;
}

function getTimeoutResult(side) {
  return {
    reason: `${side === "w" ? "White" : "Black"} ran out of time.`,
    winner: side === "w" ? "b" : "w",
    loser: side,
  };
}

function applyMove(chess, move) {
  try {
    return chess.move(move);
  } catch {
    return null;
  }
}

function startClock(io, match, service) {
  if (match.state.clockInterval) {
    timer.clearInterval(match.state.clockInterval);
  }

  match.state.clock.turnStartedAt = Date.now();

  match.state.clockInterval = timer.setInterval(() => {
    const expiredSide = getExpiredSide(match);
    io.to(match.room).emit("clockUpdate", getRemainingSeconds(match));
    io.to(match.room).emit("game:state", getStatePayload(match));

    if (expiredSide) {
      const result = getTimeoutResult(expiredSide);
      service.finish(match, result.reason, result);
    }
  }, CLOCK_TICK_MS);
}

function scheduleOpeningActionTimeout(io, match, service) {
  clearOpeningActionTimeout(match);
  if (match.state.chess.history().length >= OPENING_ACTIONS_REQUIRED) return;

  match.state.openingActionTimeout = timer.setTimeout(() => {
    if (match.state.chess.history().length >= OPENING_ACTIONS_REQUIRED) return;

    const waitingSide = match.state.currentTurn;
    const result = {
      reason: `No opening move made by ${
        waitingSide === "w" ? "White" : "Black"
      }.`,
      winner: waitingSide === "w" ? "b" : "w",
      loser: waitingSide,
    };
    service.finish(match, result.reason, result);
  }, Number(process.env.OPENING_ACTION_TIMEOUT_MS || DEFAULT_OPENING_ACTION_TIMEOUT_MS));
}

function clearOpeningActionTimeout(match) {
  if (!match.state.openingActionTimeout) return;

  timer.clearTimeout(match.state.openingActionTimeout);
  delete match.state.openingActionTimeout;
}

function getStatePayload(match) {
  return {
    matchId: match.matchId,
    room: match.room,
    fen: match.state.chess.fen(),
    timeLeft: getRemainingSeconds(match),
    clock: {
      ...match.state.clock,
      remaining: getRemainingMs(match),
    },
    currentTurn: match.state.currentTurn,
    roles: match.players.reduce((roles, player) => {
      roles[player.playerId] = player.side;
      return roles;
    }, {}),
  };
}

function clearMatchTimers(match) {
  clearOpeningActionTimeout(match);

  if (match.state.clockInterval) {
    timer.clearInterval(match.state.clockInterval);
    delete match.state.clockInterval;
  }
}

function isGameOver(chess) {
  return chess.isGameOver ? chess.isGameOver() : chess.game_over();
}

function getGameOverReason(chess) {
  if (chess.isCheckmate?.() || chess.in_checkmate?.()) {
    return "Checkmate.";
  }

  if (chess.isDraw?.() || chess.in_draw?.()) {
    return "Draw.";
  }

  return "Game over.";
}

function getGameResult(chess) {
  if (chess.isCheckmate?.() || chess.in_checkmate?.()) {
    const loser = chess.turn();
    return {
      reason: "Checkmate.",
      winner: loser === "w" ? "b" : "w",
      loser,
    };
  }

  if (chess.isDraw?.() || chess.in_draw?.()) {
    return {
      reason: "Draw.",
      winner: null,
      loser: null,
    };
  }

  return {
    reason: getGameOverReason(chess),
    winner: null,
    loser: null,
  };
}

module.exports = {
  gameType: "chess",

  getMatchmakingParams(payload) {
    const timeControl = Number(payload?.timeControl || payload?.time);
    if (![60, 300, 600].includes(timeControl)) return null;

    return {
      game: "chess",
      timeControl,
      wager: payload?.wager || 0,
    };
  },

  createMatch(players, payload) {
    const timeControl = Number(payload?.timeControl || payload?.time);
    const random = Math.random() < 0.5;
    const whitePlayerId = random ? players[1].playerId : players[0].playerId;
    const blackPlayerId = random ? players[0].playerId : players[1].playerId;

    const playersWithSides = players.map((player) => ({
      ...player,
      side:
        player.playerId === whitePlayerId
          ? "w"
          : player.playerId === blackPlayerId
            ? "b"
            : null,
    }));

    return {
      players: playersWithSides,
      settings: { timeControl, wager: 0 },
      metadata: { timeControl },
      state: {
        chess: null,
        clock: createClock(timeControl),
        currentTurn: "w",
      },
    };
  },

  createGame(match) {
    match.state.chess = new Chess();
  },

  getState(match) {
    return getStatePayload(match);
  },

  isFinished(match) {
    return isGameOver(match.state.chess) || Boolean(getExpiredSide(match));
  },

  getResult(match) {
    const expiredSide = getExpiredSide(match);
    if (expiredSide) return getTimeoutResult(expiredSide);
    return getGameResult(match.state.chess);
  },

  getDisconnectResult(match, playerId) {
    const loser = match.players.find((player) => player.playerId === playerId);
    const winner = match.players.find((player) => player.playerId !== playerId);

    return {
      reason: "Opponent disconnected.",
      winner: winner?.side || null,
      loser: loser?.side || null,
    };
  },

  registerSocket(service, socket) {
    socket.on("chess:selectTime", ({ time }) => {
      service.join(socket, { gameType: "chess", timeControl: time });
    });

    socket.on("move", ({ move, room, matchId }) => {
      const match = matchId
        ? service.matchManager.getById(matchId)
        : service.matchManager.getByRoom(room);
      if (!match) return;

      service.handleAction(socket, {
        matchId: match.matchId,
        action: move,
      });
    });

    socket.on("gameOver", () => {
      const match = service.matchManager.findByPlayer(socket.data.player.playerId);
      if (match) service.finish(match, "Player resigned.");
    });
  },

  onWaiting(socket) {
    socket.emit("chess:waiting");
  },

  onMatchCreated(io, match) {
    io.to(match.room).emit("playerRole", {
      white: getRolePlayer(match, "w"),
      black: getRolePlayer(match, "b"),
    });
    io.to(match.room).emit("boardState", match.state.chess.fen());
    io.to(match.room).emit("clockUpdate", getRemainingSeconds(match));
  },

  startMatch(io, match, service) {
    io.to(match.room).emit("chess:startClock", {
      time: match.settings.timeControl,
      room: match.room,
      matchId: match.matchId,
    });
    io.to(match.room).emit("game:state", getStatePayload(match));

    scheduleOpeningActionTimeout(io, match, service);
    startClock(io, match, service);
  },

  handleAction(match, playerId, action, { io, service }) {
    const expiredSide = getExpiredSide(match);
    if (expiredSide) {
      const result = getTimeoutResult(expiredSide);
      service.finish(match, result.reason, result);
      return;
    }

    if (action?.type && action.type !== "MOVE") return;

    const move = {
      from: action?.from,
      to: action?.to,
      promotion: action?.promotion || "q",
    };
    const player = service.matchManager.getPlayer(match, playerId);
    if (!move.from || !move.to || player?.side !== match.state.currentTurn) {
      return;
    }

    const result = applyMove(match.state.chess, move);
    if (!result) {
      const socket = io.sockets.sockets.get(player.socketId);
      socket?.emit("game:error", {
        code: "invalid_move",
        message: "Invalid move.",
      });
      return;
    }

    commitClock(match);

    clearOpeningActionTimeout(match);

    match.state.currentTurn = match.state.currentTurn === "w" ? "b" : "w";
    match.state.clock.activePlayer = match.state.currentTurn;
    match.state.clock.turnStartedAt = Date.now();

    if (match.state.chess.history().length < 2) {
      scheduleOpeningActionTimeout(io, match, service);
    }

    io.to(match.room).emit("move", move);
    io.to(match.room).emit("boardState", match.state.chess.fen());
    io.to(match.room).emit("clockUpdate", getRemainingSeconds(match));
    io.to(match.room).emit("game:action", {
      matchId: match.matchId,
      playerId,
      action: move,
    });
    io.to(match.room).emit("game:state", getStatePayload(match));

    if (this.isFinished(match)) {
      const gameResult = this.getResult(match);
      service.finish(match, gameResult.reason, gameResult);
    }
  },

  reconnect(io, match, socket, service) {
    const role = service.matchManager.getPlayer(
      match,
      socket.data.player.playerId
    )?.side;
    socket.emit("playerRole", {
      white: getRolePlayer(match, "w"),
      black: getRolePlayer(match, "b"),
    });
    socket.emit("boardState", match.state.chess.fen());
    socket.emit("clockUpdate", getRemainingSeconds(match));
    socket.emit("game:state", getStatePayload(match));

    if (match.status === MATCH_STATUS.PLAYING) {
      socket.emit("chess:startClock", {
        time: getRemainingSeconds(match)[role],
        room: match.room,
        matchId: match.matchId,
      });
    }
  },

  pause(io, match) {
    pauseClock(match);
    clearMatchTimers(match);
    io.to(match.room).emit("game:state", getStatePayload(match));
  },

  resume(io, match, service) {
    io.to(match.room).emit("game:state", getStatePayload(match));
    scheduleOpeningActionTimeout(io, match, service);
    startClock(io, match, service);
  },

  cleanup(io, match) {
    clearMatchTimers(match);
    leavePlayers(io, match);
  },
};
