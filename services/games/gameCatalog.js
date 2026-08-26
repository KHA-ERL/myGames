const games = [
  {
    id: "chess",
    name: "Chess",
    href: "/game/chess",
    status: "live",
    category: "board",
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
    modes: ["Casual"],
    timeControls: [{ label: "Quick", value: 0 }],
  },
  {
    id: "pool",
    name: "8-Ball Pool",
    href: "/game/8ball",
    status: "soon",
    category: "arcade",
    modes: ["Casual"],
    timeControls: [{ label: "Classic", value: 0 }],
  },
  {
    id: "checkers",
    name: "Checkers",
    href: "#",
    status: "soon",
    category: "board",
    modes: ["Casual"],
    timeControls: [{ label: "5 min", value: 300 }],
  },
];

function getGameCatalog() {
  return games;
}

module.exports = { getGameCatalog };
