const { Chess } = require("chess.js");

module.exports = (io) => {
  const waitingPlayers = { 60: [], 300: [], 600: [] };
  const activeGames = {}; // room => game state
  const roles = {}; // socketId => "w" | "b"

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("chess:selectTime", ({ time }) => {
      if (!waitingPlayers[time]) return;

      const queue = waitingPlayers[time];
      if (queue.length > 0) {
        const opponent = queue.shift();
        const room = `room-${Date.now()}`;
        const chess = new Chess();
        const random = Math.random() < 0.5;

        const whiteSocket = random ? socket : opponent;
        const blackSocket = random ? opponent : socket;

        whiteSocket.join(room);
        blackSocket.join(room);

        roles[whiteSocket.id] = "w";
        roles[blackSocket.id] = "b";

        activeGames[room] = {
          room,
          players: [whiteSocket.id, blackSocket.id],
          chess,
          timeControl: time,
          timeLeft: { w: time, b: time },
          currentTurn: "w",
        };

        io.to(room).emit("playerRole", {
          white: whiteSocket.id,
          black: blackSocket.id,
        });

        io.to(room).emit("boardState", chess.fen());
        io.to(room).emit("chess:startClock", { time, room });

        // ⏱️ Game will auto-cancel if no move in 10 seconds
        activeGames[room].timeout = setTimeout(() => {
          if (chess.history().length === 0) {
            io.to(room).emit("gameAborted", {
              reason: "No move made in 10 seconds.",
            });
            activeGames[room].players.forEach((pid) => {
              const s = io.sockets.sockets.get(pid);
              if (s) s.leave(room);
            });
            delete activeGames[room];
          }
        }, 10000);

        // ⏲️ Start real-time countdown syncing
        activeGames[room].clockInterval = setInterval(() => {
          const game = activeGames[room];
          if (!game) return;

          const side = game.currentTurn;
          game.timeLeft[side]--;

          io.to(room).emit("clockUpdate", game.timeLeft);

          if (game.timeLeft[side] <= 0) {
            clearInterval(game.clockInterval);
            io.to(room).emit("gameAborted", {
              reason: `${side === "w" ? "White" : "Black"} ran out of time.`,
            });
            game.players.forEach((pid) => {
              const s = io.sockets.sockets.get(pid);
              if (s) s.leave(room);
            });
            delete activeGames[room];
          }
        }, 1000);
      } else {
        queue.push(socket);
        socket.emit("chess:waiting");
      }
    });

    socket.on("move", ({ move, room }) => {
      const game = activeGames[room];
      if (!game) return;

      const result = game.chess.move(move);
      if (result) {
        // Clear any pending timeout
        if (game.timeout) {
          clearTimeout(game.timeout);
          delete game.timeout;
        }

        // Switch turn
        game.currentTurn = game.currentTurn === "w" ? "b" : "w";

        // Determine if we should still set a timeout
        const moveCount = game.chess.history().length;

        if (moveCount < 2) {
          // Only set timeout if both players haven't moved yet
          game.timeout = setTimeout(() => {
            io.to(room).emit("gameAborted", {
              reason: `No move made by ${
                game.currentTurn === "w" ? "White" : "Black"
              } in 10 seconds.`,
            });
            game.players.forEach((pid) => {
              const s = io.sockets.sockets.get(pid);
              if (s) s.leave(room);
            });
            clearInterval(game.clockInterval);
            delete activeGames[room];
          }, 10000);
        }

        io.to(room).emit("move", move);
        io.to(room).emit("boardState", game.chess.fen());
        io.to(room).emit("clockUpdate", game.timeLeft);
      }
    });

    socket.on("gameOver", ({ reason }) => {
      const room = Object.keys(activeGames).find((r) =>
        activeGames[r].players.includes(socket.id)
      );

      if (room) {
        io.to(room).emit("gameAborted", { reason });
        activeGames[room].players.forEach((pid) => {
          const s = io.sockets.sockets.get(pid);
          if (s) s.leave(room);
        });

        clearInterval(activeGames[room].clockInterval);
        delete activeGames[room];
      }
    });

    socket.on("reconnectGame", ({ room }) => {
      const game = activeGames[room];
      if (game && game.players.includes(socket.id)) {
        const role = roles[socket.id];
        socket.join(room);
        socket.emit("playerRole", {
          white: game.players.find((pid) => roles[pid] === "w"),
          black: game.players.find((pid) => roles[pid] === "b"),
        });
        socket.emit("boardState", game.chess.fen());
        socket.emit("chess:startClock", { time: game.timeLeft[role], room });
        socket.emit("clockUpdate", game.timeLeft);
      }
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);

      Object.values(waitingPlayers).forEach((queue) => {
        const index = queue.indexOf(socket);
        if (index !== -1) queue.splice(index, 1);
      });

      const room = Object.keys(activeGames).find((r) =>
        activeGames[r].players.includes(socket.id)
      );

      if (room) {
        const game = activeGames[room];
        const opponentId = game.players.find((pid) => pid !== socket.id);
        const opponentSocket = io.sockets.sockets.get(opponentId);

        if (opponentSocket) {
          opponentSocket.emit("gameAborted", {
            reason: "Opponent disconnected",
          });
          opponentSocket.leave(room);
        }

        clearInterval(game.clockInterval);
        delete activeGames[room];
      }

      delete roles[socket.id];
    });
  });
};
