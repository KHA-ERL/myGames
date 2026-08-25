const mongoose = require("mongoose");
const MatchModel = require("../../models/match");
const userRepository = require("../auth/userRepository");
const { DEFAULT_RATING, calculateElo } = require("../ratings/eloService");

class MatchRepository {
  constructor() {
    this.matches = [];
  }

  async recordResult(match, result) {
    const record = this.toRecord(match, result);
    record.ratingChanges = await this.updateRatings(record);

    if (mongoose.connection.readyState === 1) {
      return MatchModel.create(record);
    }

    this.matches.unshift(record);
    return record;
  }

  async getPlayerSummary(playerId, limit = 5) {
    const matches =
      mongoose.connection.readyState === 1
        ? await MatchModel.find({
            $or: [{ playerA: playerId }, { playerB: playerId }],
          })
            .sort({ finishedAt: -1 })
            .limit(limit)
            .lean()
        : this.matches
            .filter((match) =>
              match.players.some((player) => player.playerId === playerId)
            )
            .slice(0, limit);

    return {
      wins: matches.filter((match) => this.getOutcome(match, playerId) === "win")
        .length,
      losses: matches.filter(
        (match) => this.getOutcome(match, playerId) === "loss"
      ).length,
      recentMatches: matches.map((match) => ({
        ...match,
        outcome: this.getOutcome(match, playerId),
      })),
    };
  }

  toRecord(match, result) {
    const [playerA, playerB] = match.players;
    const finishedAt = new Date();
    const startedAt = match.startedAt
      ? new Date(match.startedAt)
      : new Date(match.createdAt);

    return {
      matchId: match.id,
      game: match.game,
      playerA: playerA?.playerId || null,
      playerB: playerB?.playerId || null,
      winner: this.getPlayerIdBySide(match, result?.winner),
      loser: this.getPlayerIdBySide(match, result?.loser),
      resultReason: result?.reason || null,
      timeControl: Number(match.settings?.timeControl || 0),
      durationMs: Math.max(0, finishedAt.getTime() - startedAt.getTime()),
      date: finishedAt,
      players: match.players.map((player) => ({
        playerId: player.playerId,
        side: player.side,
        result: this.getPlayerResult(player, result),
      })),
      settings: match.settings,
      ratings: match.players.reduce((ratings, player) => {
        ratings[player.playerId] = player.rating || DEFAULT_RATING;
        return ratings;
      }, {}),
      status: match.status,
      result,
      startedAt,
      finishedAt,
    };
  }

  getPlayerIdBySide(match, side) {
    if (!side) return null;
    return match.players.find((player) => player.side === side)?.playerId || null;
  }

  getPlayerResult(player, result) {
    if (!result?.winner) return result?.reason === "Draw." ? "draw" : null;
    if (result.winner === player.side) return "win";
    if (result.loser === player.side) return "loss";
    return null;
  }

  getOutcome(match, playerId) {
    const player = match.players.find((entry) => entry.playerId === playerId);
    if (!player || !match.result) return "unknown";
    if (!match.result.winner) return "draw";
    return match.result.winner === player.side ? "win" : "loss";
  }

  async updateRatings(record) {
    if (record.game !== "chess" || !record.result) return null;
    if (!record.winner && !record.loser && record.resultReason !== "Draw.") {
      return null;
    }

    const playerA = await userRepository.findById(record.playerA);
    const playerB = await userRepository.findById(record.playerB);
    const ratingA = playerA?.ratings?.chess || DEFAULT_RATING;
    const ratingB = playerB?.ratings?.chess || DEFAULT_RATING;
    const outcomeA = this.getOutcome(record, record.playerA);
    const outcomeB = this.getOutcome(record, record.playerB);
    const nextA = calculateElo(ratingA, ratingB, outcomeA);
    const nextB = calculateElo(ratingB, ratingA, outcomeB);

    await userRepository.updateRating(record.playerA, "chess", nextA);
    await userRepository.updateRating(record.playerB, "chess", nextB);

    return {
      [record.playerA]: { before: ratingA, after: nextA },
      [record.playerB]: { before: ratingB, after: nextB },
    };
  }
}

module.exports = new MatchRepository();
