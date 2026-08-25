const crypto = require("crypto");
const mongoose = require("mongoose");
const UserModel = require("../../models/user");
const { DEFAULT_RATING } = require("../ratings/eloService");

class UserRepository {
  constructor() {
    this.users = new Map();
    this.identities = new Map();
  }

  async findById(id) {
    if (mongoose.connection.readyState === 1) {
      const user = await UserModel.findById(id).lean();
      return user ? this.toPublicUser(user) : null;
    }

    return this.users.get(id) || null;
  }

  async findByProviderIdentity(provider, providerUserId) {
    if (mongoose.connection.readyState === 1) {
      const user = await UserModel.findOne({
        identities: { $elemMatch: { provider, providerUserId } },
      }).lean();
      return user ? this.toPublicUser(user) : null;
    }

    const userId = this.identities.get(this.getIdentityKey(provider, providerUserId));
    return userId ? this.findById(userId) : null;
  }

  async findOrCreateFromOAuth(profile) {
    const existing = await this.findByProviderIdentity(
      profile.provider,
      profile.providerUserId
    );
    if (existing) return existing;

    const userData = {
      displayName: profile.displayName || "Player",
      email: profile.email || null,
      avatar: profile.avatar || null,
      identities: [
        {
          provider: profile.provider,
          providerUserId: profile.providerUserId,
        },
      ],
      ratings: { chess: DEFAULT_RATING },
    };

    if (mongoose.connection.readyState === 1) {
      const user = await UserModel.create(userData);
      return this.toPublicUser(user.toObject());
    }

    const user = {
      id: crypto.randomUUID(),
      ...userData,
      provider: profile.provider,
      providerUserId: profile.providerUserId,
      createdAt: new Date(),
    };

    this.users.set(user.id, user);
    this.identities.set(
      this.getIdentityKey(profile.provider, profile.providerUserId),
      user.id
    );

    return user;
  }

  async linkProviderIdentity(userId, profile) {
    if (mongoose.connection.readyState === 1) {
      const user = await UserModel.findByIdAndUpdate(
        userId,
        {
          $addToSet: {
            identities: {
              provider: profile.provider,
              providerUserId: profile.providerUserId,
            },
          },
        },
        { new: true }
      ).lean();

      return user ? this.toPublicUser(user) : null;
    }

    const user = await this.findById(userId);
    if (!user) return null;

    const identity = {
      provider: profile.provider,
      providerUserId: profile.providerUserId,
    };
    user.identities.push(identity);
    this.identities.set(
      this.getIdentityKey(identity.provider, identity.providerUserId),
      user.id
    );

    return user;
  }

  async updateRating(userId, game, rating) {
    if (!userId || !game) return null;

    if (mongoose.connection.readyState === 1) {
      const user = await UserModel.findByIdAndUpdate(
        userId,
        { $set: { [`ratings.${game}`]: rating } },
        { new: true }
      ).lean();

      return user ? this.toPublicUser(user) : null;
    }

    const user = await this.findById(userId);
    if (!user) return null;

    user.ratings = user.ratings || {};
    user.ratings[game] = rating;
    return user;
  }

  getIdentityKey(provider, providerUserId) {
    return `${provider}:${providerUserId}`;
  }

  toPublicUser(user) {
    const primaryIdentity = user.identities?.[0] || {};
    return {
      id: String(user._id || user.id),
      displayName: user.displayName,
      email: user.email || null,
      avatar: user.avatar || null,
      provider: primaryIdentity.provider,
      providerUserId: primaryIdentity.providerUserId,
      identities: user.identities || [],
      ratings: user.ratings || { chess: DEFAULT_RATING },
      createdAt: user.createdAt,
    };
  }
}

module.exports = new UserRepository();
