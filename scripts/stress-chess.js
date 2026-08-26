const { spawn } = require("child_process");
const { io } = require("socket.io-client");

const PORT = Number(process.env.STRESS_PORT || 3210);
const BASE_URL = `http://localhost:${PORT}`;
const TIMEOUT_MS = 5000;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function waitFor(emitter, event, predicate = () => true, timeoutMs = TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error(`Timed out waiting for ${event}`));
    }, timeoutMs);

    function handler(payload) {
      if (!predicate(payload)) return;
      cleanup();
      resolve(payload);
    }

    function cleanup() {
      clearTimeout(timeout);
      emitter.off(event, handler);
    }

    emitter.on(event, handler);
  });
}

async function waitForHttp() {
  for (let i = 0; i < 50; i += 1) {
    try {
      const response = await fetch(`${BASE_URL}/game/chess`);
      if (response.ok) return;
    } catch {}
    await wait(100);
  }

  throw new Error("Server did not become ready");
}

function startServer() {
  const child = spawn(process.execPath, ["app.js"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(PORT),
      SESSION_SECRET: "stress_session_secret",
      MATCH_READY_TIMEOUT_MS: "2000",
      RECONNECT_GRACE_MS: "700",
      OPENING_ACTION_TIMEOUT_MS: "700",
      MONGO_URL: "",
      MONGODB_URI: "",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  let logs = "";
  child.stdout.on("data", (data) => {
    logs += data.toString();
  });
  child.stderr.on("data", (data) => {
    logs += data.toString();
  });

  return { child, getLogs: () => logs };
}

async function createGuest(label) {
  const response = await fetch(`${BASE_URL}/game/chess`);
  const html = await response.text();
  const cookie = response.headers.get("set-cookie")?.split(";")[0];
  const token = html.match(/window\.PLAY_PLAYER_TOKEN = "([^"]+)"/)?.[1];
  const playerId = html.match(/window\.PLAY_PLAYER_ID = "([^"]+)"/)?.[1];

  assert(cookie, `${label} did not receive guest cookie`);
  assert(token, `${label} did not receive player token`);
  assert(playerId, `${label} did not receive player id`);

  return { label, cookie, token, playerId };
}

async function connectGuest(guest) {
  const socket = io(BASE_URL, {
    auth: { playerToken: guest.token },
    extraHeaders: { Cookie: guest.cookie },
    transports: ["websocket"],
    forceNew: true,
    reconnection: false,
  });

  await waitFor(socket, "connect", () => true, TIMEOUT_MS);
  socket.testGuest = guest;
  return socket;
}

async function createChessMatch(a, b, timeControl = 60) {
  const matchedA = waitFor(a, "matchmaking:matched");
  const matchedB = waitFor(b, "matchmaking:matched");
  const roleA = waitFor(a, "playerRole");
  const roleB = waitFor(b, "playerRole");

  a.emit("matchmaking:join", { gameType: "chess", timeControl });
  b.emit("matchmaking:join", { gameType: "chess", timeControl });

  const [matchA, matchB, rolesA, rolesB] = await Promise.all([
    matchedA,
    matchedB,
    roleA,
    roleB,
  ]);

  assert(matchA.matchId === matchB.matchId, "Players matched into different rooms");

  a.emit("game:ready", { matchId: matchA.matchId });
  b.emit("game:ready", { matchId: matchA.matchId });

  await Promise.all([waitFor(a, "game:start"), waitFor(b, "game:start")]);

  return {
    matchId: matchA.matchId,
    room: matchA.room,
    white: rolesA.white,
    black: rolesA.black,
    rolesA,
    rolesB,
  };
}

async function testRapidQueueJoins() {
  const a = await connectGuest(await createGuest("rapid-a"));
  const b = await connectGuest(await createGuest("rapid-b"));
  const matched = Promise.all([
    waitFor(a, "matchmaking:matched"),
    waitFor(b, "matchmaking:matched"),
  ]);

  for (let i = 0; i < 5; i += 1) {
    a.emit("matchmaking:join", { gameType: "chess", timeControl: 60 });
    b.emit("matchmaking:join", { gameType: "chess", timeControl: 60 });
  }

  const [matchA, matchB] = await matched;
  assert(matchA.matchId === matchB.matchId, "Rapid joins did not create one shared match");
  a.disconnect();
  b.disconnect();
}

async function testDuplicateTabsDoNotSelfMatch() {
  const guest = await createGuest("duplicate");
  const first = await connectGuest(guest);
  const second = await connectGuest(guest);
  let matched = false;

  first.on("matchmaking:matched", () => {
    matched = true;
  });
  second.on("matchmaking:matched", () => {
    matched = true;
  });

  first.emit("matchmaking:join", { gameType: "chess", timeControl: 60 });
  second.emit("matchmaking:join", { gameType: "chess", timeControl: 60 });
  await wait(300);

  assert(!matched, "Duplicate tabs for one player matched against themselves");
  first.disconnect();
  second.disconnect();
}

async function testRefreshDuringMatchmaking() {
  const guestA = await createGuest("refresh-queue-a");
  const a = await connectGuest(guestA);
  a.emit("matchmaking:join", { gameType: "chess", timeControl: 60 });
  await waitFor(a, "matchmaking:waiting");
  a.disconnect();

  const refreshedA = await connectGuest(guestA);
  const b = await connectGuest(await createGuest("refresh-queue-b"));
  const matched = Promise.all([
    waitFor(refreshedA, "matchmaking:matched"),
    waitFor(b, "matchmaking:matched"),
  ]);

  refreshedA.emit("matchmaking:join", { gameType: "chess", timeControl: 60 });
  b.emit("matchmaking:join", { gameType: "chess", timeControl: 60 });
  await matched;

  refreshedA.disconnect();
  b.disconnect();
}

async function testRefreshDuringGame() {
  const guestA = await createGuest("refresh-game-a");
  const a = await connectGuest(guestA);
  const b = await connectGuest(await createGuest("refresh-game-b"));
  const match = await createChessMatch(a, b);

  a.disconnect();
  const refreshedA = await connectGuest(guestA);
  const reconnected = waitFor(refreshedA, "player:reconnected");
  refreshedA.emit("reconnectGame", { room: match.room });
  await reconnected;

  refreshedA.disconnect();
  b.disconnect();
}

async function testInvalidMoveAndOpeningTimeout() {
  const a = await connectGuest(await createGuest("invalid-a"));
  const b = await connectGuest(await createGuest("invalid-b"));
  const match = await createChessMatch(a, b);
  const finished = waitFor(a, "game:finished", (payload) =>
    String(payload.reason || "").includes("No opening move")
  );

  a.emit("game:action", {
    matchId: match.matchId,
    action: { type: "MOVE", from: "b2", to: "b5", promotion: "q" },
  });

  await finished;
  assert(a.connected && b.connected, "Invalid move crashed or disconnected clients");
  a.disconnect();
  b.disconnect();
}

async function testDisconnectForfeit() {
  const a = await connectGuest(await createGuest("disconnect-a"));
  const b = await connectGuest(await createGuest("disconnect-b"));
  await createChessMatch(a, b);

  const finished = waitFor(b, "game:finished", (payload) =>
    String(payload.reason || "").includes("disconnected")
  );
  a.disconnect();
  await finished;
  b.disconnect();
}

async function run() {
  const server = startServer();
  try {
    await waitForHttp();
    await testRapidQueueJoins();
    await testDuplicateTabsDoNotSelfMatch();
    await testRefreshDuringMatchmaking();
    await testRefreshDuringGame();
    await testInvalidMoveAndOpeningTimeout();
    await testDisconnectForfeit();
    console.log("Chess stress checks passed");
  } finally {
    server.child.kill("SIGTERM");
    await wait(150);
    const logs = server.getLogs();
    if (/Error: Invalid move|app crashed|TypeError|Unhandled/i.test(logs)) {
      console.error(logs);
      process.exitCode = 1;
    }
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
