const passport = require("passport");
const jwt = require("jsonwebtoken");
const userRepository = require("../services/auth/userRepository");

function normalizeProfile(provider, profile) {
  const email = profile.emails?.[0]?.value || null;
  const avatar = profile.photos?.[0]?.value || null;

  return {
    provider,
    providerUserId: profile.id,
    displayName: profile.displayName,
    email,
    avatar,
  };
}

function configureGoogle() {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return;
  }

  const GoogleStrategy = require("passport-google-oauth20").Strategy;
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || "/auth/google/callback",
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const user = await userRepository.findOrCreateFromOAuth(
            normalizeProfile("google", profile)
          );
          done(null, user);
        } catch (error) {
          done(error);
        }
      }
    )
  );
}

function configureApple() {
  if (
    !process.env.APPLE_CLIENT_ID ||
    !process.env.APPLE_TEAM_ID ||
    !process.env.APPLE_KEY_ID ||
    !process.env.APPLE_PRIVATE_KEY
  ) {
    return;
  }

  const AppleStrategy = require("passport-apple");
  passport.use(
    new AppleStrategy(
      {
        clientID: process.env.APPLE_CLIENT_ID,
        teamID: process.env.APPLE_TEAM_ID,
        keyID: process.env.APPLE_KEY_ID,
        privateKeyString: process.env.APPLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
        callbackURL: process.env.APPLE_CALLBACK_URL || "/auth/apple/callback",
        passReqToCallback: true,
        scope: ["name", "email"],
      },
      async (req, accessToken, refreshToken, idToken, profile, done) => {
        try {
          const claims = jwt.decode(idToken) || {};
          const appleUser = req.body.user ? JSON.parse(req.body.user) : null;
          const name = appleUser?.name
            ? [appleUser.name.firstName, appleUser.name.lastName]
                .filter(Boolean)
                .join(" ")
            : null;
          const user = await userRepository.findOrCreateFromOAuth({
            provider: "apple",
            providerUserId: claims.sub,
            displayName: name || "Player",
            email: claims.email || null,
            avatar: null,
          });
          done(null, user);
        } catch (error) {
          done(error);
        }
      }
    )
  );
}

module.exports = function configurePassport() {
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      done(null, await userRepository.findById(id));
    } catch (error) {
      done(error);
    }
  });

  configureGoogle();
  configureApple();

  return passport;
};
