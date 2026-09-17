const games = [
  {
    id: "chess",
    name: "Chess",
    href: "/game/chess",
    status: "live",
    category: "board",
    description:
      "Play live online chess with matchmaking, server-authoritative clocks, Elo ratings, rematches, and match history.",
    keywords: [
      "online chess",
      "live chess game",
      "rated chess matchmaking",
      "play chess with friends",
      "multiplayer chess",
    ],
    modes: ["Rated", "Casual"],
    timeControls: [
      { label: "1 min", value: 60 },
      { label: "5 min", value: 300 },
      { label: "10 min", value: 600 },
    ],
    ratingKey: "chess",
  },
  {
    id: "tictactoe",
    name: "Tic-Tac-Toe",
    href: "/game/tic-tac-toe",
    status: "live",
    category: "quick",
    description:
      "Play fast online Tic-Tac-Toe through the same real-time matchmaking system used across $Play games.",
    keywords: [
      "online tic tac toe",
      "play tic tac toe",
      "quick multiplayer game",
      "casual browser game",
    ],
    modes: ["Casual"],
    timeControls: [{ label: "Quick", value: 0 }],
  },
  {
    id: "pool",
    name: "8-Ball Pool",
    href: "/game/8ball",
    status: "soon",
    category: "arcade",
    description:
      "8-Ball Pool is planned as a casual real-time multiplayer pool game for the $Play lobby.",
    keywords: ["online 8 ball pool", "multiplayer pool game", "browser pool game"],
    modes: ["Casual"],
    timeControls: [{ label: "Classic", value: 0 }],
  },
  {
    id: "checkers",
    name: "Checkers",
    href: "#",
    status: "soon",
    category: "board",
    description:
      "Checkers is planned as a quick board game with matchmaking and shared player profiles.",
    keywords: ["online checkers", "multiplayer checkers", "browser checkers game"],
    modes: ["Casual"],
    timeControls: [{ label: "5 min", value: 300 }],
  },
];

function getGameCatalog() {
  return games;
}

module.exports = { getGameCatalog };
