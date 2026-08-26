const mongoose = require("mongoose");

const AuthIdentitySchema = new mongoose.Schema(
  {
    provider: {
      type: String,
      enum: ["google", "apple"],
      required: true,
    },
    providerUserId: {
      type: String,
      required: true,
    },
  },
  { _id: false }
);

const UserSchema = new mongoose.Schema(
  {
    displayName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      default: null,
    },
    avatar: {
      type: String,
      default: null,
    },
    identities: {
      type: [AuthIdentitySchema],
      default: [],
    },
    ratings: {
      chess: {
        type: Number,
        default: 1200,
      },
    },
    friends: {
      type: [
        {
          userId: {
            type: String,
            required: true,
          },
          status: {
            type: String,
            enum: ["accepted"],
            default: "accepted",
          },
          createdAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

UserSchema.index(
  { "identities.provider": 1, "identities.providerUserId": 1 },
  { unique: true, sparse: true }
);

module.exports = mongoose.models.User || mongoose.model("User", UserSchema);
