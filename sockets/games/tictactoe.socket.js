const MATCH_STATUS = require("../matchmaking/matchStatus");

const BOARD_SIZE = 9;
const WIN_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

function getState(match) {
  return {
    matchId: match.id,
    room: match.room,
    board: match.state.board,
    currentTurn: match.state.currentTurn,
    winner: match.state.winner,
    winningLine: match.state.winningLine,
    players: match.players,
    status: match.status,
  };
}

function getWinner(board) {
  for (const line of WIN_LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { side: board[a], line };
    }
  }

  return null;
}

function isBoardFull(board) {
  return board.every(Boolean);
}

module.exports = {
  gameType: "tictactoe",

  getMatchmakingParams(payload) {
    return {
      game: "tictactoe",
      timeControl: Number(payload?.timeControl || 0),
      wager: payload?.wager || 0,
    };
  },

  createMatch(players) {
    const random = Math.random() < 0.5;
    const xPlayerId = random ? players[1].playerId : players[0].playerId;
    const oPlayerId = random ? players[0].playerId : players[1].playerId;

    return {
      players: players.map((player) => ({
        ...player,
        side:
          player.playerId === xPlayerId
            ? "X"
            : player.playerId === oPlayerId
              ? "O"
              : null,
      })),
      settings: { timeControl: 0, wager: 0 },
      state: {
        board: Array(BOARD_SIZE).fill(null),
        currentTurn: "X",
        winner: null,
        winningLine: [],
      },
    };
  },

  createGame(match) {
    match.state.board = Array(BOARD_SIZE).fill(null);
  },

  getState,

  isFinished(match) {
    return Boolean(match.state.winner) || isBoardFull(match.state.board);
  },

  getResult(match) {
    if (match.state.winner) {
      return {
        reason: `${match.state.winner} wins.`,
        winner: match.state.winner,
        loser: match.state.winner === "X" ? "O" : "X",
      };
    }

    return {
      reason: "Draw.",
      winner: null,
      loser: null,
    };
  },

  onMatchCreated(io, match) {
    io.to(match.room).emit("game:state", getState(match));
  },

  startMatch(io, match) {
    io.to(match.room).emit("game:state", getState(match));
  },

  handleAction(match, playerId, action, { io, service }) {
    if (action?.type !== "MARK") return;

    const player = service.matchManager.getPlayer(match, playerId);
    const cell = Number(action.cell);
    if (
      player?.side !== match.state.currentTurn ||
      !Number.isInteger(cell) ||
      cell < 0 ||
      cell >= BOARD_SIZE ||
      match.state.board[cell]
    ) {
      return;
    }

    match.state.board[cell] = player.side;
    const winner = getWinner(match.state.board);
    if (winner) {
      match.state.winner = winner.side;
      match.state.winningLine = winner.line;
    } else {
      match.state.currentTurn = match.state.currentTurn === "X" ? "O" : "X";
    }

    io.to(match.room).emit("game:state", getState(match));

    if (this.isFinished(match)) {
      const result = this.getResult(match);
      service.finish(match, result.reason, result);
    }
  },

  reconnect(io, match, socket, service) {
    socket.emit("game:state", getState(match));
    if (match.status === MATCH_STATUS.PLAYING) {
      socket.emit("game:start", service.getMatchPayload(match));
    }
  },

  pause(io, match) {
    io.to(match.room).emit("game:state", getState(match));
  },

  resume(io, match) {
    io.to(match.room).emit("game:state", getState(match));
  },

  cleanup(io, match) {
    match.players.forEach((player) => {
      const socket = io.sockets.sockets.get(player.socketId);
      if (socket) socket.leave(match.room);
    });
  },
};
