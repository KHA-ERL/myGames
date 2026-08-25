const crypto = require("crypto");

const COOKIE_NAME = "play_player";

function getSecret() {
  return process.env.SESSION_SECRET || "dev_session_secret";
}

function sign(value) {
  return crypto.createHmac("sha256", getSecret()).update(value).digest("base64url");
}

function createToken(playerId) {
  return `${playerId}.${sign(playerId)}`;
}

function verifyToken(token) {
  if (!token || typeof token !== "string") return null;

  const separator = token.lastIndexOf(".");
  if (separator === -1) return null;

  const playerId = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  const expected = sign(playerId);

  try {
    const providedBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    if (
      providedBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(providedBuffer, expectedBuffer)
    ) {
      return null;
    }
  } catch {
    return null;
  }

  return playerId;
}

function parseCookies(cookieHeader) {
  return String(cookieHeader || "")
    .split(";")
    .map((cookie) => cookie.trim().split("="))
    .reduce((cookies, [name, ...value]) => {
      if (!name) return cookies;
      cookies[name] = decodeURIComponent(value.join("="));
      return cookies;
    }, {});
}

function createGuestIdentity() {
  const playerId = `guest_${crypto.randomUUID()}`;
  return { playerId, token: createToken(playerId) };
}

function httpIdentity(req, res, next) {
  if (req.user?.id) {
    req.playerId = req.user.id;
    res.locals.playerId = req.user.id;
    res.locals.playerToken = "";
    return next();
  }

  const cookies = parseCookies(req.headers.cookie);
  let playerId = verifyToken(cookies[COOKIE_NAME]);
  let token = cookies[COOKIE_NAME];

  if (!playerId) {
    const identity = createGuestIdentity();
    playerId = identity.playerId;
    token = identity.token;
    const secure = req.secure || req.headers["x-forwarded-proto"] === "https";
    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      secure,
      maxAge: 1000 * 60 * 60 * 24 * 365,
    });
  }

  req.playerId = playerId;
  res.locals.playerId = playerId;
  res.locals.playerToken = token;
  next();
}

function socketIdentity(socket, next) {
  if (socket.request.user?.id) {
    socket.data.player = {
      playerId: socket.request.user.id,
      socketId: socket.id,
      connected: true,
    };
    return next();
  }

  const cookies = parseCookies(socket.handshake.headers.cookie);
  const token = socket.handshake.auth?.playerToken || cookies[COOKIE_NAME];
  const playerId = verifyToken(token);

  if (!playerId) {
    return next(new Error("Invalid player identity"));
  }

  socket.data.player = {
    playerId,
    socketId: socket.id,
    connected: true,
  };
  next();
}

module.exports = {
  httpIdentity,
  socketIdentity,
};
