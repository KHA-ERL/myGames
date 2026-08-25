const REQUIRED_GAME_ADAPTER_METHODS = [
  "createGame",
  "handleAction",
  "getState",
  "isFinished",
  "getResult",
];

function validateGameAdapter(adapter) {
  if (!adapter?.gameType) {
    throw new Error("Game adapter must define gameType.");
  }

  REQUIRED_GAME_ADAPTER_METHODS.forEach((method) => {
    if (typeof adapter[method] !== "function") {
      throw new Error(`${adapter.gameType} adapter must define ${method}().`);
    }
  });
}

module.exports = {
  REQUIRED_GAME_ADAPTER_METHODS,
  validateGameAdapter,
};
