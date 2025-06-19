    const express = require("express");
    const { Server } = require("socket.io");  // <--- changed this line    const http = require("http");
    const { Chess } = require("chess.js");
    const path = require("path");
    const http = require("http");


    const app = express();
    const server = http.createServer(app);
    // const io = socket(server);
    const io = new Server(server, {
        cors: {
        origin: "*", // allow all origins (for testing)
        methods: ["GET", "POST"]
        }
    });
    

    const chess = new Chess();
    let players = {};

    app.set("view engine", "ejs");
    app.use(express.static(path.join(__dirname, "public")));


    app.get("/", (req, res) => {
        res.render("index", { title: "Welcome to the Chess Game" });
    });

    io.on("connection", function (uniquesocket) {
        console.log("User connected:", uniquesocket.id);

        // Assign roles
        if (!players.white) {
            players.white = uniquesocket.id;
            uniquesocket.emit("playerRole", "w");
        } else if (!players.black) {
            players.black = uniquesocket.id;
            uniquesocket.emit("playerRole", "b");
        } else {
            uniquesocket.emit("spectatorRole");
        }

        // Send current board state
        uniquesocket.emit("boardState", chess.fen());

        // Handle moves
        uniquesocket.on("move", (move) => {
            try {
                if (chess.turn() === "w" && uniquesocket.id !== players.white) return;
                if (chess.turn() === "b" && uniquesocket.id !== players.black) return;

                const result = chess.move(move);
                if (result) {
                    io.emit("move", move);
                    io.emit("boardState", chess.fen());
                } else {
                    console.log("Invalid move:", move);
                    uniquesocket.emit("invalidMove", move);
                }
            } catch (error) {
                console.error("Move error:", error);
                uniquesocket.emit("invalidMove", move);
            }
        });

        // Handle disconnect
        uniquesocket.on("disconnect", function () {
            console.log("User disconnected:", uniquesocket.id);
            if (uniquesocket.id === players.white) {
                delete players.white;
            } else if (uniquesocket.id === players.black) {
                delete players.black;
            }
        });
    });


    const PORT = process.env.PORT || 3000;

    server.listen(3000, '0.0.0.0', () => {
        console.log('Server running on 0.0.0.0:3000');
    });