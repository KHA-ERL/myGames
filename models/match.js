const mongoose = require("mongoose");

const MatchPlayerSchema = new mongoose.Schema(
  {
    playerId: {
      type: String,
      required: true,
    },
    side: {
      type: String,
      default: null,
    },
    result: {
      type: String,
      enum: ["win", "loss", "draw", "abandoned", null],
      default: null,
    },
  },
  { _id: false }
);

const MatchSchema = new mongoose.Schema(
  {
    matchId: {
      type: String,
      required: true,
      unique: true,
    },
    game: {
      type: String,
      required: true,
    },
    playerA: {
      type: String,
      required: true,
    },
    playerB: {
      type: String,
      required: true,
    },
    winner: {
      type: String,
      default: null,
    },
    loser: {
      type: String,
      default: null,
    },
    resultReason: {
      type: String,
      default: null,
    },
    timeControl: {
      type: Number,
      default: 0,
    },
    durationMs: {
      type: Number,
      default: 0,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    players: {
      type: [MatchPlayerSchema],
      default: [],
    },
    settings: {
      timeControl: Number,
      wager: {
        type: Number,
        default: 0,
      },
    },
    status: {
      type: String,
      required: true,
    },
    result: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    ratings: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    ratingChanges: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    startedAt: Date,
    finishedAt: Date,
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.Match || mongoose.model("Match", MatchSchema);
