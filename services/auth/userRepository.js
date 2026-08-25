const crypto = require("crypto");

class InMemoryUserRepository {
  constructor() {
    this.users = new Map();
    this.identities = new Map();
  }

  async findById(id) {
    return this.users.get(id) || null;
  }

  async findByProviderIdentity(provider, providerUserId) {
    const userId = this.identities.get(this.getIdentityKey(provider, providerUserId));
    return userId ? this.findById(userId) : null;
  }

  async findOrCreateFromOAuth(profile) {
    const existing = await this.findByProviderIdentity(
      profile.provider,
      profile.providerUserId
    );
    if (existing) return existing;

    const user = {
      id: crypto.randomUUID(),
      displayName: profile.displayName || "Player",
      email: profile.email || null,
      avatar: profile.avatar || null,
      provider: profile.provider,
      providerUserId: profile.providerUserId,
      createdAt: new Date(),
      identities: [
        {
          provider: profile.provider,
          providerUserId: profile.providerUserId,
        },
      ],
    };

    this.users.set(user.id, user);
    this.identities.set(
      this.getIdentityKey(profile.provider, profile.providerUserId),
      user.id
    );

    return user;
  }

  async linkProviderIdentity(userId, profile) {
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

  getIdentityKey(provider, providerUserId) {
    return `${provider}:${providerUserId}`;
  }
}

module.exports = new InMemoryUserRepository();
