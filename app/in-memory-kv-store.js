const { KVNamespace, allLister } = require('./kv-namespace');

class InMemoryKVStore {
  constructor() {
    this.values = {};
  }

  getClient(namespace) {
    this.values[namespace] = this.values[namespace] || {};
    return new KVNamespace({
      getter: async (key) => this.values[namespace][key] || null,
      putter: async (key, value) => (this.values[namespace][key] = value),
      remover: async (key) => delete this.values[namespace][key],
      lister: async (prefix, limit, startAfter) =>
        allLister(Object.entries(this.values[namespace]), prefix, limit, startAfter),
    });
  }
}

module.exports = { InMemoryKVStore };
