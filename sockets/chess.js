const { Chess } = require("chess.js");

module.exports = (io) => {
  let players = {};
  let chess = new Chess();

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    const playerCount = Object.keys(players).length;
    if (playerCount < 2) {
      const role = playerCount === 0 ? "w" : "b";
      players[socket.id] = role;
      socket.emit("playerRole", role);
      socket.emit("boardState", chess.fen());
    } else {
      socket.emit("spectatorRole");
      socket.emit("boardState", chess.fen());
    }

    socket.on("move", (move) => {
      const result = chess.move(move);
      if (result) {
        io.emit("move", move);
        io.emit("boardState", chess.fen());
      }
    });

    socket.on("disconnect", () => {
      delete players[socket.id];
      console.log("User disconnected:", socket.id);
    });
  });
};
