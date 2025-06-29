const socket = io();
const chess = new Chess();
const boardElement = document.querySelector(".chessboard");

let draggedPiece = null;
let sourceSquare = null;
let playerRole = null;
let lastMove = null;

let clickSource = null; // For click-to-move

const getPieceUnicode = (piece) => {
  const unicodePieces = {
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
  return unicodePieces[symbol] || "";
};

const renderBoard = () => {
  const board = chess.board();
  boardElement.innerHTML = "";

  board.forEach((row, rowIndex) => {
    row.forEach((square, squareIndex) => {
      const squareElement = document.createElement("div");
      squareElement.classList.add(
        "square",
        (rowIndex + squareIndex) % 2 === 0 ? "light" : "dark"
      );
      squareElement.dataset.row = rowIndex;
      squareElement.dataset.col = squareIndex;
      // ✅ Add highlight for last move
      const squarePos = `${String.fromCharCode(97 + squareIndex)}${
        8 - rowIndex
      }`;

      // Highlight last move (from and to)
      if (
        lastMove &&
        (squarePos === lastMove.from || squarePos === lastMove.to)
      ) {
        squareElement.classList.add("highlight-yellow");
      }

      // Highlight click selection (only one)
      if (
        clickSource &&
        clickSource.row === rowIndex &&
        clickSource.col === squareIndex
      ) {
        squareElement.classList.add("highlight");
      }

      if (square) {
        const pieceElement = document.createElement("div");
        pieceElement.classList.add(
          "piece",
          square.color === "w" ? "white" : "black"
        );
        pieceElement.innerText = getPieceUnicode(square);
        pieceElement.draggable = playerRole === square.color;

        // Drag logic
        pieceElement.addEventListener("dragstart", (e) => {
          if (pieceElement.draggable) {
            draggedPiece = pieceElement;
            sourceSquare = { row: rowIndex, col: squareIndex };
            e.dataTransfer.setData("text/plain", "");
          }
        });

        pieceElement.addEventListener("dragend", () => {
          draggedPiece = null;
          sourceSquare = null;
        });

        // Click-to-move: select source
        pieceElement.addEventListener("click", () => {
          if (playerRole === square.color) {
            clickSource = { row: rowIndex, col: squareIndex };
            highlightSquare(squareElement);
          }
        });

        squareElement.appendChild(pieceElement);
      }

      // Drag logic
      squareElement.addEventListener("dragover", (e) => e.preventDefault());
      squareElement.addEventListener("drop", (e) => {
        e.preventDefault();
        if (draggedPiece && sourceSquare) {
          const targetSquare = {
            row: parseInt(squareElement.dataset.row),
            col: parseInt(squareElement.dataset.col),
          };
          handleMove(sourceSquare, targetSquare);
        }
      });

      // Click-to-move: select destination
      squareElement.addEventListener("click", () => {
        handleClickMove(rowIndex, squareIndex);
        const row = parseInt(squareElement.dataset.row);
        const col = parseInt(squareElement.dataset.col);
        const pos = `${String.fromCharCode(97 + col)}${8 - row}`;
        const piece = chess.get(pos);

        // First click: select piece
        if (!clickSource) {
          if (piece && piece.color === playerRole) {
            clickSource = { row, col, pos };

            // Highlight selected square
            renderBoard();
            const selected = document.querySelector(
              `[data-row="${row}"][data-col="${col}"]`
            );
            if (selected) selected.classList.add("highlight-yellow");
          }
          return;
        }

        // Second click: attempt move
        const move = {
          from: clickSource.pos,
          to: pos,
          promotion: "q",
        };

        const result = chess.move(move);
        if (result) {
          lastMove = { from: move.from, to: move.to }; // ✅ Track last click move
          socket.emit("move", move);
        } else {
          console.log("Invalid move:", move);
        }

        clickSource = null;
        renderBoard(); // Clear board + highlight
      });

      boardElement.appendChild(squareElement);
    });
  });

  boardElement.classList.toggle("flipped", playerRole === "b");
};

const handleClickMove = (row, col) => {
  const pos = `${String.fromCharCode(97 + col)}${8 - row}`; // a1-h8 format
  const piece = chess.get(pos);

  // First click - select piece
  if (!clickSource) {
    if (piece && piece.color === playerRole) {
      clickSource = { row, col, pos };
      highlightSquare(row, col);
    }
    return;
  }

  // Second click - try to move
  const move = {
    from: clickSource.pos,
    to: pos,
    promotion: "q", // auto promote to queen
  };

  const result = chess.move(move);
  if (result) {
    lastMove = { from: move.from, to: move.to };  // ✅ Save last move
    socket.emit("move", move);
  } else {
    console.log("Invalid move:", move);
  }

  clickSource = null;
  renderBoard();
};

const handleMove = (source, target) => {
  const move = {
    from: `${String.fromCharCode(97 + source.col)}${8 - source.row}`,
    to: `${String.fromCharCode(97 + target.col)}${8 - target.row}`,
    promotion: "q",
  };

  console.log("Attempting move:", move);

  const result = chess.move(move);
  if (result) {
    lastMove = { from: move.from, to: move.to }; // ✅ Save the move
    socket.emit("move", move);
    renderBoard(); // Rerender board with highlight
  } else {
    console.log("Invalid move:", move);
  }

  draggedPiece = null;
  sourceSquare = null;
};

const highlightSquare = (row, col) => {
  renderBoard(); // clear old highlights
  const selector = `[data-row="${row}"][data-col="${col}"]`;
  const square = document.querySelector(selector);
  if (square) square.classList.add("highlight-yellow");
};

// Socket Events
socket.on("playerRole", (role) => {
  playerRole = role;
  renderBoard();
});

socket.on("spectatorRole", () => {
  playerRole = null;
  renderBoard();
});

socket.on("boardState", (fen) => {
  chess.load(fen);
  renderBoard();
});

socket.on("move", (move) => {
  chess.move(move);
  renderBoard();
});

renderBoard();
