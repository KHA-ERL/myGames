const express = require("express");
const { Server } = require("socket.io");
const http = require("http");
const path = require("path");
const authRoutes = require("./routes/authRoutes")

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

// View & Static
app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

// Routes
app.use("/", require("./routes/index"));
app.use("/game", require("./routes/games"));
app.use("/user",authRoutes)

// Sockets
require("./sockets")(io);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
