class InMemoryStore {
  constructor() {
    this.queues = new Map();
    this.matches = new Map();
  }
}

module.exports = InMemoryStore;
