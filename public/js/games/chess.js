const socket = io();
const chess = new Chess();
const boardElement = document.querySelector(".chessboard");

let playerRole = null;
let currentTurn = "w";
let timeLeft = { w: 0, b: 0 };
let myRoom = null;
let lastMove = null;
let whiteId = null;
let blackId = null;
let sourceSquare = null;
let clickSource = null;
let waitingTimeout = null;

// Unicode for chess pieces
const getPieceUnicode = (piece) => {
  const pieces = {
    p: "♟",
    n: "♞",
    b: "♝",
    r: "♜",
    q: "♛",
    k: "♚",
    P: "♙",
    N: "♘",
    B: "♗",
    R: "♖",
    Q: "♕",
    K: "♔",
  };
  const symbol = piece.color === "w" ? piece.type.toUpperCase() : piece.type;
  return pieces[symbol] || "";
};

const formatTime = (sec) => {
  const m = Math.floor(sec / 60)
    .toString()
    .padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
};

const updateClocks = () => {
  document.getElementById("whiteClock").textContent = formatTime(timeLeft.w);
  document.getElementById("blackClock").textContent = formatTime(timeLeft.b);
};

const stopClocks = () => {
  clearInterval(whiteTimer);
  clearInterval(blackTimer);
};

function startClock(color) {
  stopClocks(); // Stop any existing timer

  if (color === "w") {
    whiteTimer = setInterval(() => {
      timeLeftW--;
      updateClocks();
      if (timeLeftW <= 0) {
        stopClocks();
        socket.emit("gameOver", {
          reason: "White ran out of time, Black wins",
        });
      }
    }, 1000);
  } else {
    blackTimer = setInterval(() => {
      timeLeftB--;
      updateClocks();
      if (timeLeftB <= 0) {
        stopClocks();
        socket.emit("gameOver", {
          reason: "Black ran out of time, White wins",
        });
      }
    }, 1000);
  }
}

const renderBoard = () => {
  const board = chess.board();
  boardElement.innerHTML = "";

  board.forEach((row, rIdx) => {
    row.forEach((square, cIdx) => {
      const squareEl = document.createElement("div");
      squareEl.classList.add(
        "square",
        (rIdx + cIdx) % 2 === 0 ? "light" : "dark"
      );
      const pos = `${String.fromCharCode(97 + cIdx)}${8 - rIdx}`;

      if (lastMove && (lastMove.from === pos || lastMove.to === pos)) {
        squareEl.classList.add("transition", "duration-300", "bg-lime-300");
      }

      if (square) {
        const pieceEl = document.createElement("div");
        pieceEl.classList.add(
          "piece",
          square.color === "w" ? "white" : "black"
        );
        pieceEl.textContent = getPieceUnicode(square);
        pieceEl.draggable = playerRole === square.color;

        pieceEl.addEventListener("dragstart", (e) => {
          if (!pieceEl.draggable) return;
          e.dataTransfer.setData("text/plain", "");
          sourceSquare = pos;
        });

        squareEl.appendChild(pieceEl);
      }

      squareEl.addEventListener("dragover", (e) => e.preventDefault());
      squareEl.addEventListener("drop", () => {
        if (!sourceSquare) return;
        attemptMove(sourceSquare, pos);
        sourceSquare = null;
      });

      squareEl.addEventListener("click", () => {
        if (!clickSource) {
          if (square && square.color === playerRole) {
            clickSource = pos;
          }
        } else {
          attemptMove(clickSource, pos);
          clickSource = null;
        }
      });

      boardElement.appendChild(squareEl);
    });
  });

  boardElement.classList.toggle("flipped", playerRole === "b");
};

const attemptMove = (from, to) => {
  const move = { from, to, promotion: "q" };
  const result = chess.move(move);
  if (result) {
    lastMove = { from, to };
    renderBoard();
    currentTurn = currentTurn === "w" ? "b" : "w";
    socket.emit("move", { move, room: myRoom });
  } else {
    console.log("Invalid move");
  }
};

// Time select buttons (trigger matchmaking)
document.querySelectorAll(".select-time").forEach((btn) => {
  btn.addEventListener("click", () => {
    const selectedTime = parseInt(btn.dataset.time);
    document.getElementById("waiting")?.classList.remove("hidden");
    document.getElementById("timerModal")?.remove(); // Hide modal
    socket.emit("chess:selectTime", { time: selectedTime });
  });
});

// Player assignment
socket.on("playerRole", ({ white, black }) => {
  const myId = socket.id;
  playerRole = myId === white ? "w" : "b";
  localStorage.setItem("chess-role", playerRole);

  // ✅ Hide waiting screen
  document.getElementById("waiting").classList.add("hidden");

  // ✅ Cancel auto-return timer
  if (waitingTimeout) {
    clearTimeout(waitingTimeout);
    waitingTimeout = null;
  }

  renderBoard();
});

// Game start clock and assign room
socket.on("chess:startClock", ({ time, room }) => {
  myRoom = room;
  localStorage.setItem("chess-room", room);
  timeLeftW = time;
  timeLeftB = time;
  updateClocks();
  // Initial render
  renderBoard();
});

// Sync moves / Receive FEN
socket.on("boardState", (fen) => {
  chess.load(fen);
  renderBoard();
});

// Move sync
socket.on("move", (move) => {
  chess.move(move);
  lastMove = { from: move.from, to: move.to };
  currentTurn = currentTurn === "w" ? "b" : "w";
  renderBoard();
});

// Show waiting UI
socket.on("chess:waiting", () => {
  document.getElementById("waiting")?.classList.remove("hidden");
  // Start 120s timeout
  waitingTimeout = setTimeout(() => {
    alert("No opponent joined within 2 minutes. Returning to lobby.");
    window.location.href = "/";
  }, 120000); // 120 seconds
});

// Game aborted (disconnect or timeout)
socket.on("gameAborted", ({ reason }) => {
  alert(`Game ended: ${reason}`);
  localStorage.removeItem("chess-room");
  window.location.href = "/";
});

// Clock updates every second
socket.on("clockUpdate", (newTimes) => {
  timeLeft = newTimes;
  updateClocks();
});

// Restore game if room exists
window.addEventListener("load", () => {
  const savedRoom = localStorage.getItem("chess-room");
  if (savedRoom) {
    socket.emit("reconnectGame", { room: savedRoom });
  }
});
