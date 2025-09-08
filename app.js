// app.js
const express = require("express");
const path = require("path");

const app = express();

// --- Views & Static ---
app.set("views", path.join(__dirname, "views"));   // <- explicitly point to /views
app.set("view engine", "ejs");
app.use("/public", express.static(path.join(__dirname, "public")));

// --- Routes ---
app.use("/", require("./routes/index"));
app.use("/game", require("./routes/games"));

// --- Socket.IO (disabled on Vercel; see note below) ---
if (!process.env.VERCEL) {
  // Only run Socket.IO locally or on a host that supports WebSockets
  const http = require("http");
  const server = http.createServer(app);
  const { Server } = require("socket.io");
  const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });
  require("./sockets")(io);

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

// Export the Express app so Vercel can use it as a request handler
module.exports = app;
