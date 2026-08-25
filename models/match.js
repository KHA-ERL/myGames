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
    game: {
      type: String,
      required: true,
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
    startedAt: Date,
    finishedAt: Date,
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.Match || mongoose.model("Match", MatchSchema);
