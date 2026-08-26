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

  async getLeaderboard(game = "chess", limit = 10) {
    const ratingPath = `ratings.${game}`;

    if (mongoose.connection.readyState === 1) {
      const users = await UserModel.find({ [ratingPath]: { $exists: true } })
        .sort({ [ratingPath]: -1 })
        .limit(limit)
        .lean();

      return users.map((user) => this.toPublicUser(user));
    }

    return [...this.users.values()]
      .filter((user) => user.ratings?.[game])
      .sort((a, b) => (b.ratings?.[game] || 0) - (a.ratings?.[game] || 0))
      .slice(0, limit);
  }

  async findByHandle(identifier) {
    const value = String(identifier || "").trim();
    if (!value) return null;

    if (mongoose.connection.readyState === 1) {
      const user = await UserModel.findOne({
        $or: [
          { email: value.toLowerCase() },
          { displayName: new RegExp(`^${this.escapeRegExp(value)}$`, "i") },
        ],
      }).lean();

      return user ? this.toPublicUser(user) : null;
    }

    return (
      [...this.users.values()].find(
        (user) =>
          user.email?.toLowerCase() === value.toLowerCase() ||
          user.displayName?.toLowerCase() === value.toLowerCase()
      ) || null
    );
  }

  async addFriend(userId, friendId) {
    if (!userId || !friendId || userId === friendId) return null;

    const user = await this.findById(userId);
    const friend = await this.findById(friendId);
    if (!user || !friend) return null;

    if (mongoose.connection.readyState === 1) {
      await UserModel.updateOne(
        { _id: userId },
        {
          $addToSet: {
            friends: { userId: friendId, status: "accepted" },
          },
        }
      );
      await UserModel.updateOne(
        { _id: friendId },
        {
          $addToSet: {
            friends: { userId, status: "accepted" },
          },
        }
      );

      return this.findById(userId);
    }

    user.friends = user.friends || [];
    friend.friends = friend.friends || [];
    if (!user.friends.some((entry) => entry.userId === friendId)) {
      user.friends.push({ userId: friendId, status: "accepted", createdAt: new Date() });
    }
    if (!friend.friends.some((entry) => entry.userId === userId)) {
      friend.friends.push({ userId, status: "accepted", createdAt: new Date() });
    }

    return user;
  }

  async getFriends(userId) {
    const user = await this.findById(userId);
    if (!user?.friends?.length) return [];

    const friends = await Promise.all(
      user.friends.map((friend) => this.findById(friend.userId))
    );

    return friends.filter(Boolean);
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
      friends: user.friends || [],
      createdAt: user.createdAt,
    };
  }

  escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
}

module.exports = new UserRepository();
