module.exports = function(io) {
  const { socketIdentity } = require("./core/identity");
  const MatchmakingService = require("./matchmaking/MatchmakingService");
  const chess = require("./games/chess.socket");
  const tictactoe = require("./games/tictactoe.socket");

  io.use(socketIdentity);

  const matchmaking = new MatchmakingService(io);
  matchmaking.registerGame(chess);
  matchmaking.registerGame(tictactoe);

  io.on("connection", (socket) => {
    console.log(
      "User connected:",
      socket.data.player.playerId,
      socket.id
    );
    matchmaking.handleConnection(socket);
  });
};
