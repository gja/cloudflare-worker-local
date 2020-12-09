const { KVNamespace } = require('./kv-namespace');

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
      lister: async (prefix, limit, startAfter) => {
        // Get all matching keys, sorted
        const all = Object.entries(this.values[namespace])
          .filter(([key]) => key.startsWith(prefix))
          .sort(([keyA], [keyB]) => keyA.localeCompare(keyB));

        // Find the correct part of the sorted array to return
        let startIndex = 0,
          endIndex = all.length;
        if (startAfter !== '') {
          startIndex = all.findIndex(([key]) => key === startAfter);
          // If we couldn't find where to start, return nothing
          if (startIndex === -1) return { keys: [], next: '' };
          // Since we want to start AFTER this index, add 1 to it
          startIndex++;
        }
        endIndex = startIndex + limit;

        // Return the keys and the next key if there is one
        return {
          keys: all.slice(startIndex, endIndex),
          next: endIndex < all.length ? all[endIndex - 1][0] : '',
        };
      },
    });
  }
}

module.exports = { InMemoryKVStore };
