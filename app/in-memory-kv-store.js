class InMemoryKVStore {
  constructor() {
    this.values = {};
  }

  getClient(namespace) {
    this.values[namespace] = this.values[namespace] || {};
    return {
      get: async key => this.values[namespace][key],
      put: async (key, value) => (this.values[namespace][key] = value),
      delete: async key => delete this.values[namespace][key]
    };
  }
}

module.exports = { InMemoryKVStore };
