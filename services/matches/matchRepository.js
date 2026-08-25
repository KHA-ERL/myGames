class InMemoryMatchRepository {
  async recordResult(match, result) {
    return {
      id: match.id,
      game: match.game,
      players: match.players,
      settings: match.settings,
      result,
      finishedAt: new Date(),
    };
  }
}

module.exports = new InMemoryMatchRepository();
