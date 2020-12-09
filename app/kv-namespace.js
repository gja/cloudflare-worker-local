const { TextDecoder, TextEncoder } = require('util');

/**
 * @typedef {Object} KVValue
 * @property {string} value
 * @property {number} expiration
 * @property {(* | null)} metadata
 */

/**
 * @typedef {Object} KVNamespaceOptions
 * @property {function(key: string): Promise<KVValue | null>} getter
 * @property {function(key: string, value: KVValue): Promise<void>} putter
 * @property {function(key: string): Promise<void>} remover
 * @property {function(prefix: string, limit: number, startAfter: string): Promise<{keys: (string | KVValue)[][], next: string}>} lister
 */

class KVNamespace {
  /**
   * @returns {number} seconds since the UNIX epoch
   */
  static getTimestamp() {
    return Math.round(Date.now() / 1000);
  }

  /**
   * @param {(string | number | undefined)} value
   * @returns {number} value as an integer, or -1 if it isn't one
   * @private
   */
  static _normaliseInteger(value) {
    if (typeof value === 'number') {
      return Math.round(value);
    } else if (typeof value === 'string') {
      const parsed = parseInt(value);
      return isNaN(parsed) ? -1 : parsed;
    } else {
      return -1;
    }
  }

  /**
   * @param {KVNamespaceOptions} options
   */
  constructor(options) {
    const { getter, putter, remover, lister } = options;
    this.getter = getter;
    this.putter = putter;
    this.remover = remover;
    this.lister = lister;
  }

  /**
   * @param {string} key
   * @param {("text" | "json" | "arrayBuffer" | "stream")} [type]
   * @returns {Promise<* | null>}
   */
  async get(key, type) {
    return (await this.getWithMetadata(key, type)).value;
  }

  // TODO: support "stream" type
  /**
   * @param {string} key
   * @param {("text" | "json" | "arrayBuffer" | "stream")} [type]
   * @returns {Promise<{value: (* | null), metadata: (* | null)}>}
   */
  async getWithMetadata(key, type) {
    // Get value (with metadata/expiration), if we couldn't find anything, return null
    const fullValue = await this.getter(key);
    if (fullValue === null) {
      return { value: null, metadata: null };
    }
    // Extract out value, expiration and metadata
    const { value, expiration, metadata } = fullValue;

    // Check expiration, and delete key if expired
    if (expiration !== -1 && expiration < KVNamespace.getTimestamp()) {
      await this.delete(key);
      return { value: null, metadata: null };
    }

    // Get correctly typed value, defaulting to text
    let typedValue = value;
    if (type === 'json') {
      typedValue = JSON.parse(value);
    } else if (type === 'arrayBuffer') {
      typedValue = new TextEncoder().encode(value).buffer;
    } else if (type === 'stream') {
      throw new Error('Type "stream" is not supported!');
    }

    return { value: typedValue, metadata };
  }

  // TODO: support FormData and ReadableStream's as values
  /**
   * @param {string} key
   * @param {(string | ArrayBuffer)} value
   * @param {{expiration: (string | number | undefined), expirationTtl: (string | number | undefined), metadata: (* | undefined)}} [options]
   * @returns {Promise<void>}
   */
  async put(key, value, options) {
    options = options || {};

    // Convert value to string if it isn't already
    if (value instanceof ArrayBuffer) {
      value = new TextDecoder().decode(value);
    }

    // Normalise expiration
    let expiration = KVNamespace._normaliseInteger(options.expiration);
    const expirationTtl = KVNamespace._normaliseInteger(options.expirationTtl);
    if (expirationTtl !== -1) {
      expiration = KVNamespace.getTimestamp() + expirationTtl;
    }

    // Normalise metadata
    const metadata = options.metadata === undefined ? null : options.metadata;

    // Store value, expiration and metadata
    await this.putter(key, { value, expiration, metadata });
  }

  /**
   * @param {string} key
   * @returns {Promise<void>}
   */
  async delete(key) {
    return this.remover(key);
  }

  /**
   * @param {{prefix: (string | undefined), limit: (number | undefined), cursor: (string | undefined)}} [options]
   * @returns {Promise<{keys: { name: string, expiration: (number | undefined), metadata: (* | undefined) }[], list_complete: boolean, cursor: string}>}
   */
  async list(options) {
    // Get options
    options = options || {};
    const prefix = options.prefix || '';
    const limit = options.limit === undefined ? 1000 : options.limit;
    if (limit <= 0) {
      throw new Error('Invalid limit: must be > 0');
    }
    const startAfter = options.cursor ? Buffer.from(options.cursor, 'base64').toString('utf8') : '';

    // Get all keys
    const { keys, next } = await this.lister(prefix, limit, startAfter);

    // Get keys matching prefix
    const timestamp = KVNamespace.getTimestamp();
    const expiredKeys = [];
    const filteredKeys = keys
      .map(([name, fullValue]) => {
        // Extract out value, expiration and metadata
        const { expiration, metadata } = fullValue;
        return {
          name,
          expiration: expiration === -1 ? undefined : expiration,
          metadata: metadata == null ? undefined : metadata,
        };
      })
      .filter(({ name, expiration }) => {
        // Check timestamp
        if (expiration !== undefined && expiration < timestamp) {
          expiredKeys.push(name);
          return false;
        }
        return true;
      });

    // Delete expired keys
    for (const expiredKey of expiredKeys) {
      await this.delete(expiredKey);
    }

    // Convert next to something that looks more cursor-like
    const cursor = next === '' ? '' : Buffer.from(next, 'utf8').toString('base64');

    return { keys: filteredKeys, list_complete: next === '', cursor };
  }
}

module.exports = { KVNamespace };
