const socket = io(window.PLAY_SOCKET_URL || undefined, {
  auth: { playerToken: window.PLAY_PLAYER_TOKEN },
});
const chess = new Chess();
const boardElement = document.querySelector(".chessboard");

let playerRole = null;
let currentTurn = "w";
let timeLeft = { w: 0, b: 0 };
let myRoom = null;
let myMatchId = null;
let whiteId = null;
let blackId = null;
let sourceSquare = null;
let clickSource = null;
let waitingTimeout = null;
let gameEnded = false;
let gameStarted = false;
let lastRenderedFen = null;

const renderBoardIfChanged = () => {
  if (chess.fen() === lastRenderedFen) return;
  renderBoard();
};

const loadFen = (fen) => {
  if (!fen || fen === chess.fen()) return false;
  chess.load(fen);
  return true;
};

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

const renderBoard = () => {
  const board = chess.board();
  boardElement.innerHTML = "";

  board.forEach((row, rIdx) => {
    row.forEach((square, cIdx) => {
      const squareEl = document.createElement("div");
      squareEl.classList.add(
        "square",
        "w-12",
        "h-12",
        "flex",
        "items-center",
        "justify-center",
        "text-3xl",
        "cursor-pointer",
        (rIdx + cIdx) % 2 === 0 ? "bg-amber-100" : "bg-amber-600"
        //(rIdx + cIdx) % 2 === 0 ? "bg-gray-200" : "bg-gray-600"
      );
      const pos = `${String.fromCharCode(97 + cIdx)}${8 - rIdx}`;

      if (clickSource === pos) {
        squareEl.classList.add("bg-lime-300");
      }

      if (square) {
        const pieceEl = document.createElement("div");
        pieceEl.classList.add(
          "piece",
          square.color === "w" ? "white" : "black"
        );
        pieceEl.textContent = getPieceUnicode(square);
        pieceEl.draggable = gameStarted && playerRole === square.color;

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
            renderBoard();
          }
        } else {
          const from = clickSource;
          clickSource = null;
          renderBoard();
          attemptMove(from, pos);
        }
      });

      boardElement.appendChild(squareEl);
    });
  });

  boardElement.classList.toggle("flipped", playerRole === "b");
  lastRenderedFen = chess.fen();
};

const attemptMove = (from, to) => {
  if (!gameStarted || !myMatchId) return;

  socket.emit("game:action", {
    matchId: myMatchId,
    action: {
      type: "MOVE",
      from,
      to,
      promotion: "q",
    },
  });
};

// Time select buttons (trigger matchmaking)
document.querySelectorAll(".select-time").forEach((btn) => {
  btn.addEventListener("click", () => {
    const selectedTime = parseInt(btn.dataset.time);
    document.getElementById("waiting")?.classList.remove("hidden");
    document.getElementById("timerModal")?.remove(); // Hide modal
    socket.emit("matchmaking:join", {
      gameType: "chess",
      timeControl: selectedTime,
    });
  });
});

socket.on("matchmaking:matched", ({ matchId, room, status }) => {
  myMatchId = matchId;
  myRoom = room;
  localStorage.setItem("chess-match", matchId);
  localStorage.setItem("chess-room", room);
  document.getElementById("waiting")?.classList.add("hidden");
  gameStarted = status === "playing";
  document
    .getElementById("readyPanel")
    ?.classList.toggle("hidden", gameStarted);
  renderBoard();
});

document.getElementById("readyButton")?.addEventListener("click", () => {
  if (!myMatchId) return;
  socket.emit("game:ready", { matchId: myMatchId });
  document.getElementById("readyButton").disabled = true;
  document.getElementById("readyStatus").textContent = "Waiting for opponent";
});

socket.on("game:ready-status", ({ players }) => {
  const readyCount = players.filter((player) => player.ready).length;
  const readyStatus = document.getElementById("readyStatus");
  if (readyStatus) readyStatus.textContent = `${readyCount}/2 ready`;
});

// Player assignment
socket.on("playerRole", ({ white, black }) => {
  const myId = window.PLAY_PLAYER_ID;
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
socket.on("chess:startClock", ({ time, room, matchId }) => {
  myRoom = room;
  myMatchId = matchId || myMatchId;
  if (myMatchId) localStorage.setItem("chess-match", myMatchId);
  localStorage.setItem("chess-room", room);
  timeLeft = { w: time, b: time };
  updateClocks();
  // Initial render
  renderBoardIfChanged();
});

socket.on("game:start", () => {
  gameStarted = true;
  document.getElementById("readyPanel")?.classList.add("hidden");
  renderBoard();
});

// Sync moves / Receive FEN
socket.on("boardState", (fen) => {
  if (loadFen(fen)) renderBoard();
});

// Move sync
socket.on("move", () => {});

socket.on("game:state", ({ fen, timeLeft: serverTimeLeft, currentTurn: turn }) => {
  const boardChanged = loadFen(fen);
  if (serverTimeLeft) timeLeft = serverTimeLeft;
  if (turn) currentTurn = turn;
  updateClocks();
  if (boardChanged) renderBoard();
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

socket.on("matchmaking:waiting", () => {
  document.getElementById("waiting")?.classList.remove("hidden");
});

// Game aborted (disconnect or timeout)
const handleGameEnded = (reason) => {
  if (gameEnded) return;
  gameEnded = true;
  alert(`Game ended: ${reason}`);
  localStorage.removeItem("chess-match");
  localStorage.removeItem("chess-room");
  window.location.href = "/";
};

socket.on("gameAborted", ({ reason }) => {
  handleGameEnded(reason);
});

socket.on("game:finished", ({ reason }) => {
  handleGameEnded(reason);
});

// Clock updates every second
socket.on("clockUpdate", (newTimes) => {
  timeLeft = newTimes;
  updateClocks();
});

// Restore game if room exists
window.addEventListener("load", () => {
  const savedRoom = localStorage.getItem("chess-room");
  socket.emit("reconnectGame", { room: savedRoom || undefined });
});
