// module.exports = function(io) {
//   const namespace = io.of("/checkers");
  
//   namespace.on("connection", (socket) => {
//     console.log("Checkers player connected:", socket.id);

//     // Join room, emit moves, track roles
//     socket.on("joinRoom", (roomId) => {
//       socket.join(roomId);
//       // Assign color, emit to other player
//     });

//     socket.on("move", ({ roomId, move }) => {
//       socket.to(roomId).emit("move", move);
//     });
//   });
// };

// sockets/checkers.js
module.exports = function(io) {
  const nsp = io.of("/checkers");

  nsp.on("connection", socket => {
    console.log("Checkers Connected:", socket.id);

    // join a dynamic room
    socket.on("joinRoom", roomId => {
      socket.join(roomId);
      // optionally track players per room:
      const clients = Array.from(nsp.adapter.rooms.get(roomId) || []);
      if (clients.length <= 2) {
        // assign color: first = red, second = black
        const role = clients.length === 1 ? "red" : "black";
        socket.emit("playerRole", role);
      } else {
        socket.emit("spectator");
      }
      // broadcast current board state here if you store it
    });

    // relay moves to everyone else in the same room
    socket.on("move", ({ roomId, move }) => {
      socket.to(roomId).emit("move", move);
    });
  });
};
