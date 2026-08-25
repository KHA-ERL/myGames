// app.js
require("dotenv").config();

const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");
const { httpIdentity } = require("./sockets/core/identity");
const createSessionMiddleware = require("./config/session");
const configurePassport = require("./config/passport");
const { connectToMongoDb } = require("./utils/mongodb/database");

const app = express();
const sessionMiddleware = createSessionMiddleware();
const passport = configurePassport();
app.set("trust proxy", 1);

// --- Views & Static ---
app.set("views", path.join(__dirname, "views"));   // <- explicitly point to /views
app.set("view engine", "ejs");
app.locals.socketUrl = process.env.SOCKET_URL || "";
app.use(express.urlencoded({ extended: true }));
app.use("/public", express.static(path.join(__dirname, "public")));
app.use(sessionMiddleware);
app.use(passport.initialize());
app.use(passport.session());
app.use(httpIdentity);

// --- Routes ---
app.use("/", require("./routes/index"));
app.use("/auth", require("./routes/authRoutes"));
app.use("/game", require("./routes/games"));

function startServer() {
  const server = http.createServer(app);
  const allowedOrigins = process.env.APP_URL
    ? process.env.APP_URL.split(",").map((origin) => origin.trim())
    : "*";
  const io = new Server(server, {
    cors: { origin: allowedOrigins, methods: ["GET", "POST"] },
  });
  io.engine.use(sessionMiddleware);
  io.engine.use(passport.initialize());
  io.engine.use(passport.session());

  require("./sockets")(io);

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  return server;
}

// Persistent Node hosts run this file directly and get Express + Socket.IO.
// Serverless adapters can import the Express app without starting a socket server.
if (require.main === module) {
  connectToMongoDb(process.env.MONGO_URL || process.env.MONGODB_URI).catch(
    (error) => {
      console.error("MongoDB connection failed:", error.message);
    }
  );
  startServer();
}

app.startServer = startServer;
module.exports = app;
