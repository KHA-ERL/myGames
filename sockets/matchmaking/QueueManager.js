class QueueManager {
  constructor(store) {
    this.store = store || { queues: new Map() };
  }

  join({ queueKey, player, isMatchable = () => true }) {
    const existing = this.findPlayerQueue(player.playerId);
    if (existing?.queueKey === queueKey) {
      this.updateQueuedPlayer(queueKey, player);
      return { status: "waiting", queueKey, alreadyQueued: true };
    }

    this.cancel(player.playerId);

    const queue = this.store.queues.get(queueKey) || [];

    while (queue.length > 0) {
      const opponent = queue.shift();
      if (opponent.playerId !== player.playerId && isMatchable(opponent)) {
        this.store.queues.set(queueKey, queue);
        return { status: "matched", players: [opponent, player] };
      }
    }

    queue.push(player);
    this.store.queues.set(queueKey, queue);
    return { status: "waiting", queueKey };
  }

  cancel(playerId) {
    for (const [key, queue] of this.store.queues.entries()) {
      this.store.queues.set(
        key,
        queue.filter((player) => player.playerId !== playerId)
      );
    }
  }

  findPlayerQueue(playerId) {
    for (const [queueKey, queue] of this.store.queues.entries()) {
      if (queue.some((player) => player.playerId === playerId)) {
        return { queueKey };
      }
    }

    return null;
  }

  updateQueuedPlayer(queueKey, player) {
    const queue = this.store.queues.get(queueKey) || [];
    const index = queue.findIndex((entry) => entry.playerId === player.playerId);
    if (index !== -1) queue[index] = player;
    this.store.queues.set(queueKey, queue);
  }

  getQueueKey({ game, timeControl = 0, wager = 0 }) {
    return `${game}:${timeControl}:${wager}`;
  }

  getSnapshot() {
    const queues = {};
    let queuedPlayers = 0;

    for (const [queueKey, queue] of this.store.queues.entries()) {
      queues[queueKey] = queue.length;
      queuedPlayers += queue.length;
    }

    return { queuedPlayers, queues };
  }
}

module.exports = QueueManager;
