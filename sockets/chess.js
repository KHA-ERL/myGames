const { Chess } = require("chess.js");

module.exports = (io) => {
  const chess = new Chess();
  let players = {};

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);
    // ... same logic you had before
  });
};
