const DEFAULT_RECONNECT_GRACE_MS = 15000;

class ReconnectService {
  start(match, playerId, onExpire) {
    this.clear(match, playerId);

    match.reconnectTimers = match.reconnectTimers || {};
    match.reconnectTimers[playerId] = setTimeout(
      onExpire,
      Number(process.env.RECONNECT_GRACE_MS || DEFAULT_RECONNECT_GRACE_MS)
    );
  }

  clear(match, playerId) {
    const timer = match.reconnectTimers?.[playerId];
    if (!timer) return;

    clearTimeout(timer);
    delete match.reconnectTimers[playerId];
  }

  clearAll(match) {
    Object.keys(match.reconnectTimers || {}).forEach((playerId) => {
      this.clear(match, playerId);
    });
  }
}

module.exports = ReconnectService;
