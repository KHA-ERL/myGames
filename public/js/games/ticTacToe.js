const socket = io(window.PLAY_SOCKET_URL || undefined, {
  auth: { playerToken: window.PLAY_PLAYER_TOKEN },
});

const boardElement = document.getElementById("board");
const statusElement = document.getElementById("status");
const readyPanel = document.getElementById("readyPanel");
const readyButton = document.getElementById("readyButton");
const readyStatus = document.getElementById("readyStatus");

let matchId = null;
let mySide = null;
let gameStarted = false;
let lastBoard = Array(9).fill(null);
let canPlayAgain = false;

function renderBoard(board = lastBoard, winningLine = []) {
  lastBoard = board;
  boardElement.innerHTML = "";

  board.forEach((mark, index) => {
    const cell = document.createElement("button");
    cell.className = "";
    cell.style.aspectRatio = "1 / 1";
    cell.textContent = mark || "";
    cell.disabled = !gameStarted || Boolean(mark);
    if (winningLine.includes(index)) cell.classList.add("is-winning");
    cell.addEventListener("click", () => {
      socket.emit("game:action", {
        matchId,
        action: { type: "MARK", cell: index },
      });
    });
    boardElement.appendChild(cell);
  });
}

document.getElementById("joinGame")?.addEventListener("click", () => {
  socket.emit("matchmaking:join", { gameType: "tictactoe" });
  statusElement.textContent = "Waiting for opponent...";
});

readyButton?.addEventListener("click", () => {
  if (canPlayAgain) {
    window.location.href = "/game/tic-tac-toe";
    return;
  }

  if (!matchId) return;
  socket.emit("game:ready", { matchId });
  readyButton.disabled = true;
  readyStatus.textContent = "Waiting for opponent";
});

socket.on("matchmaking:waiting", ({ gameType }) => {
  if (gameType === "tictactoe") statusElement.textContent = "Waiting for opponent...";
});

socket.on("matchmaking:matched", ({ matchId: id, players, status }) => {
  matchId = id;
  const me = players.find((player) => player.playerId === window.PLAY_PLAYER_ID);
  mySide = me?.side || null;
  gameStarted = status === "playing";
  statusElement.textContent = mySide ? `You are ${mySide}` : "Match found";
  readyPanel.classList.toggle("hidden", gameStarted);
});

socket.on("game:ready-status", ({ players }) => {
  const readyCount = players.filter((player) => player.ready).length;
  readyStatus.textContent = `${readyCount}/2 ready`;
});

socket.on("game:start", () => {
  gameStarted = true;
  readyPanel.classList.add("hidden");
  statusElement.textContent = `You are ${mySide}`;
  renderBoard();
});

socket.on("game:state", ({ board, currentTurn, winner, winningLine }) => {
  renderBoard(board, winningLine || []);
  if (winner) {
    statusElement.textContent = winner === mySide ? "You won" : "You lost";
  } else if (gameStarted) {
    statusElement.textContent =
      currentTurn === mySide ? "Your turn" : "Opponent's turn";
  }
});

socket.on("game:finished", ({ reason }) => {
  gameStarted = false;
  statusElement.textContent = reason || "Game finished";
  readyPanel.classList.remove("hidden");
  readyStatus.textContent = reason || "Game finished";
  readyButton.disabled = false;
  readyButton.textContent = "Play Again";
  canPlayAgain = true;
  renderBoard();
});

socket.on("player:disconnected", () => {
  statusElement.textContent = "Opponent disconnected. Waiting...";
});

socket.on("player:reconnected", () => {
  statusElement.textContent = "Reconnected";
});

renderBoard();
