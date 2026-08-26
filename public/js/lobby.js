(function () {
  const search = document.getElementById("gameSearch");
  const filters = document.querySelectorAll(".lobby-filter");
  const cards = document.querySelectorAll(".game-card");
  const previewBoard = document.getElementById("previewBoard");
  const dashCanvas = document.getElementById("dashCanvas");
  let activeFilter = "all";

  function renderPreviewBoard() {
    if (!previewBoard || previewBoard.children.length) return;

    const pieces = {
      0: "♜",
      1: "♞",
      2: "♝",
      3: "♛",
      4: "♚",
      5: "♝",
      6: "♞",
      7: "♜",
      8: "♟",
      9: "♟",
      10: "♟",
      11: "♟",
      12: "♟",
      13: "♟",
      14: "♟",
      15: "♟",
      48: "♙",
      49: "♙",
      50: "♙",
      51: "♙",
      52: "♙",
      53: "♙",
      54: "♙",
      55: "♙",
      56: "♖",
      57: "♘",
      58: "♗",
      59: "♕",
      60: "♔",
      61: "♗",
      62: "♘",
      63: "♖",
    };

    for (let i = 0; i < 64; i += 1) {
      const square = document.createElement("div");
      const row = Math.floor(i / 8);
      const col = i % 8;
      square.className = "preview-square";
      if ((row + col) % 2 === 1) square.classList.add("is-dark");
      if (pieces[i]) {
        square.textContent = pieces[i];
        square.classList.add(i < 16 ? "is-black" : "is-white");
      }
      previewBoard.appendChild(square);
    }
  }

  function startCanvas() {
    if (!dashCanvas) return;

    const context = dashCanvas.getContext("2d");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;

    function resize() {
      dashCanvas.width = window.innerWidth * window.devicePixelRatio;
      dashCanvas.height = window.innerHeight * window.devicePixelRatio;
      context.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
    }

    function draw() {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const cell = 64;
      context.clearRect(0, 0, width, height);
      context.fillStyle = "#11130f";
      context.fillRect(0, 0, width, height);

      for (let y = -cell; y < height + cell; y += cell) {
        for (let x = -cell; x < width + cell; x += cell) {
          const active = ((x / cell + y / cell + Math.floor(frame / 90)) % 2) === 0;
          context.fillStyle = active ? "rgba(243,240,232,0.025)" : "rgba(215,255,85,0.018)";
          context.fillRect(x, y, cell, cell);
        }
      }

      context.strokeStyle = "rgba(243,240,232,0.05)";
      context.lineWidth = 1;
      for (let x = 0; x < width; x += cell) {
        context.beginPath();
        context.moveTo(x, 0);
        context.lineTo(x, height);
        context.stroke();
      }
      for (let y = 0; y < height; y += cell) {
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(width, y);
        context.stroke();
      }

      if (!reduceMotion) {
        frame += 1;
        window.requestAnimationFrame(draw);
      }
    }

    resize();
    draw();
    window.addEventListener("resize", () => {
      resize();
      if (reduceMotion) draw();
    });
  }

  function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = String(value);
  }

  function applyFilters() {
    const term = (search?.value || "").trim().toLowerCase();
    cards.forEach((card) => {
      const matchesTerm = !term || card.dataset.name.includes(term);
      const matchesFilter =
        activeFilter === "all" || card.dataset.category === activeFilter;
      card.classList.toggle("hidden", !matchesTerm || !matchesFilter);
    });
  }

  search?.addEventListener("input", applyFilters);
  filters.forEach((button) => {
    button.addEventListener("click", () => {
      activeFilter = button.dataset.filter || "all";
      filters.forEach((entry) => {
        entry.classList.toggle("is-active", entry === button);
      });
      applyFilters();
    });
  });

  if (typeof io !== "function") return;

  const socket = io(window.PLAY_SOCKET_URL || undefined, {
    transports: ["websocket", "polling"],
  });

  socket.emit("lobby:subscribe");
  socket.on("lobby:state", (state) => {
    setText("lobbyOnline", state.onlinePlayers || 0);
    setText("lobbyQueued", state.queuedPlayers || 0);
    setText("lobbyMatches", state.activeMatches || 0);

    Object.entries(state.games || {}).forEach(([gameId, gameState]) => {
      const card = document.querySelector(`[data-game-id="${gameId}"]`);
      if (!card) return;
      const queued = card.querySelector(".game-queued");
      const matches = card.querySelector(".game-matches");
      if (queued) queued.textContent = String(gameState.queuedPlayers || 0);
      if (matches) matches.textContent = String(gameState.activeMatches || 0);
      if (gameId === "chess") {
        setText("heroChessQueue", gameState.queuedPlayers || 0);
      }
    });
  });

  renderPreviewBoard();
  startCanvas();
})();
