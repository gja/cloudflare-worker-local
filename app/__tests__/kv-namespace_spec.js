const { KVNamespace } = require('../kv-namespace');
const { InMemoryKVStore } = require('../in-memory-kv-store');

const TEST_NAMESPACE = 'TEST_NAMESPACE';

function createNamespace(initialData) {
  const store = new InMemoryKVStore();
  store.values[TEST_NAMESPACE] = initialData || {};
  return [store.getClient(TEST_NAMESPACE), store];
}

describe('kv-namespace', () => {
  beforeEach(() => {
    // Reset getTimestamp function before each test
    KVNamespace.getTimestamp = () => 5000;
  });

  describe('get', () => {
    test('it gets text by default', async () => {
      const [ns] = createNamespace({
        key: {
          value: 'value',
          expiration: -1,
          metadata: null,
        },
      });
      expect(await ns.get('key')).toBe('value');
    });

    test('it gets text', async () => {
      const [ns] = createNamespace({
        key: {
          value: 'value',
          expiration: -1,
          metadata: null,
        },
      });
      expect(await ns.get('key', 'text')).toBe('value');
    });

    test('it gets json', async () => {
      const [ns] = createNamespace({
        key: {
          value: '{"field": "value"}',
          expiration: -1,
          metadata: null,
        },
      });
      expect(await ns.get('key', 'json')).toStrictEqual({ field: 'value' });
    });

    test('it gets array buffers', async () => {
      const [ns] = createNamespace({
        key: {
          value: '\x01\x02\x03',
          expiration: -1,
          metadata: null,
        },
      });
      expect(new Uint8Array(await ns.get('key', 'arrayBuffer'))).toStrictEqual(new Uint8Array([1, 2, 3]));
    });

    test('it fails to get streams', async () => {
      const [ns] = createNamespace({
        key: {
          value: '\x01\x02\x03',
          expiration: -1,
          metadata: null,
        },
      });
      expect.assertions(1);
      await expect(ns.get('key', 'stream')).rejects.toStrictEqual(new Error('Type "stream" is not supported!'));
    });

    test('it returns null for non-existent keys', async () => {
      const [ns] = createNamespace();
      await expect(await ns.get('key')).toBeNull();
    });

    test('it returns null for and removes expired keys', async () => {
      const [ns, store] = createNamespace({
        key: {
          value: 'value',
          expiration: 1000,
          metadata: null,
        },
      });
      await expect(store.values[TEST_NAMESPACE].key).toBeDefined();
      await expect(await ns.get('key')).toBeNull();
      await expect(store.values[TEST_NAMESPACE].key).toBeUndefined();
    });
  });

  describe('getWithMetadata', () => {
    test('it gets text by default with metadata', async () => {
      const [ns] = createNamespace({
        key: {
          value: 'value',
          expiration: -1,
          metadata: { testing: true },
        },
      });
      expect(await ns.getWithMetadata('key')).toStrictEqual({
        value: 'value',
        metadata: { testing: true },
      });
    });

    test('it gets text with metadata', async () => {
      const [ns] = createNamespace({
        key: {
          value: 'value',
          expiration: -1,
          metadata: { testing: true },
        },
      });
      expect(await ns.getWithMetadata('key', 'text')).toStrictEqual({
        value: 'value',
        metadata: { testing: true },
      });
    });

    test('it gets json with metadata', async () => {
      const [ns] = createNamespace({
        key: {
          value: '{"field": "value"}',
          expiration: -1,
          metadata: { testing: true },
        },
      });
      expect(await ns.getWithMetadata('key', 'json')).toStrictEqual({
        value: { field: 'value' },
        metadata: { testing: true },
      });
    });

    test('it gets array buffers with metadata', async () => {
      const [ns] = createNamespace({
        key: {
          value: '\x01\x02\x03',
          expiration: -1,
          metadata: { testing: true },
        },
      });
      const { value, metadata } = await ns.getWithMetadata('key', 'arrayBuffer');
      expect({
        value: new Uint8Array(value),
        metadata,
      }).toStrictEqual({
        value: new Uint8Array([1, 2, 3]),
        metadata: { testing: true },
      });
    });

    test('it fails to get streams with metadata', async () => {
      const [ns] = createNamespace({
        key: {
          value: '\x01\x02\x03',
          expiration: -1,
          metadata: { testing: true },
        },
      });
      expect.assertions(1);
      await expect(ns.getWithMetadata('key', 'stream')).rejects.toStrictEqual(
        new Error('Type "stream" is not supported!')
      );
    });

    test('it returns null for non-existent keys with metadata', async () => {
      const [ns] = createNamespace();
      await expect(await ns.getWithMetadata('key')).toStrictEqual({
        value: null,
        metadata: null,
      });
    });

    test('it returns null for and removes expired keys with metadata', async () => {
      const [ns, store] = createNamespace({
        key: {
          value: 'value',
          expiration: 1000,
          metadata: { testing: true },
        },
      });
      await expect(store.values[TEST_NAMESPACE].key).toBeDefined();
      await expect(await ns.getWithMetadata('key')).toStrictEqual({
        value: null,
        metadata: null,
      });
      await expect(store.values[TEST_NAMESPACE].key).toBeUndefined();
    });
  });

  describe('put', () => {
    test('it puts text', async () => {
      const [ns, store] = createNamespace();
      await ns.put('key', 'value');
      await expect(store.values[TEST_NAMESPACE].key).toStrictEqual({
        value: 'value',
        expiration: -1,
        metadata: null,
      });
    });

    test('it puts array buffers', async () => {
      const [ns, store] = createNamespace();
      await ns.put('key', new Uint8Array([1, 2, 3]).buffer);
      await expect(store.values[TEST_NAMESPACE].key).toStrictEqual({
        value: '\x01\x02\x03',
        expiration: -1,
        metadata: null,
      });
    });

    test('it puts text with expiration', async () => {
      const [ns, store] = createNamespace();
      await ns.put('key', 'value', { expiration: 1000 });
      await expect(store.values[TEST_NAMESPACE].key).toStrictEqual({
        value: 'value',
        expiration: 1000,
        metadata: null,
      });
    });

    test('it puts text with string expiration', async () => {
      const [ns, store] = createNamespace();
      await ns.put('key', 'value', { expiration: '1000' });
      await expect(store.values[TEST_NAMESPACE].key).toStrictEqual({
        value: 'value',
        expiration: 1000,
        metadata: null,
      });
    });

    test('it puts text with expiration ttl', async () => {
      KVNamespace.getTimestamp = () => 1000;
      const [ns, store] = createNamespace();
      await ns.put('key', 'value', { expirationTtl: 1000 });
      await expect(store.values[TEST_NAMESPACE].key).toStrictEqual({
        value: 'value',
        expiration: 2000,
        metadata: null,
      });
    });

    test('it puts text with string expiration ttl', async () => {
      KVNamespace.getTimestamp = () => 1000;
      const [ns, store] = createNamespace();
      await ns.put('key', 'value', { expirationTtl: '1000' });
      await expect(store.values[TEST_NAMESPACE].key).toStrictEqual({
        value: 'value',
        expiration: 2000,
        metadata: null,
      });
    });

    test('it puts text with metadata', async () => {
      const [ns, store] = createNamespace();
      await ns.put('key', 'value', { metadata: { testing: true } });
      await expect(store.values[TEST_NAMESPACE].key).toStrictEqual({
        value: 'value',
        expiration: -1,
        metadata: { testing: true },
      });
    });

    test('it puts text with expiration and metadata', async () => {
      const [ns, store] = createNamespace();
      await ns.put('key', 'value', {
        expiration: 1000,
        metadata: { testing: true },
      });
      await expect(store.values[TEST_NAMESPACE].key).toStrictEqual({
        value: 'value',
        expiration: 1000,
        metadata: { testing: true },
      });
    });

    test('it puts text with expiration ttl and metadata', async () => {
      KVNamespace.getTimestamp = () => 1000;
      const [ns, store] = createNamespace();
      await ns.put('key', 'value', {
        expirationTtl: 1000,
        metadata: { testing: true },
      });
      await expect(store.values[TEST_NAMESPACE].key).toStrictEqual({
        value: 'value',
        expiration: 2000,
        metadata: { testing: true },
      });
    });

    test('it overrides existing keys', async () => {
      const [ns, store] = createNamespace({
        key: {
          value: 'value',
          expiration: -1,
          metadata: null,
        },
      });
      await ns.put('key', 'value2', {
        expiration: 1000,
        metadata: { testing: true },
      });
      await expect(store.values[TEST_NAMESPACE].key).toStrictEqual({
        value: 'value2',
        expiration: 1000,
        metadata: { testing: true },
      });
    });
  });

  describe('delete', () => {
    test('it deletes existing keys', async () => {
      const [ns, store] = createNamespace({
        key: {
          value: 'value',
          expiration: -1,
          metadata: null,
        },
      });
      await ns.delete('key');
      await expect(store.values[TEST_NAMESPACE].key).toBeUndefined();
    });

    test('it does nothing for non-existent keys', async () => {
      const [ns] = createNamespace({});
      await ns.delete('key');
    });
  });

  describe('list', () => {
    test('it lists keys in sorted order', async () => {
      const [ns] = createNamespace({
        key3: {
          value: 'value3',
          expiration: -1,
          metadata: null,
        },
        key1: {
          value: 'value1',
          expiration: -1,
          metadata: null,
        },
        key2: {
          value: 'value2',
          expiration: -1,
          metadata: null,
        },
      });
      expect(await ns.list()).toEqual({
        keys: [{ name: 'key1' }, { name: 'key2' }, { name: 'key3' }],
        list_complete: true,
        cursor: '',
      });
    });

    test('it lists keys matching prefix', async () => {
      const [ns] = createNamespace({
        section1key1: {
          value: 'value11',
          expiration: -1,
          metadata: null,
        },
        section1key2: {
          value: 'value12',
          expiration: -1,
          metadata: null,
        },
        section2key1: {
          value: 'value21',
          expiration: -1,
          metadata: null,
        },
      });
      expect(await ns.list({ prefix: 'section1' })).toEqual({
        keys: [{ name: 'section1key1' }, { name: 'section1key2' }],
        list_complete: true,
        cursor: '',
      });
    });

    test('it lists keys with metadata', async () => {
      const [ns] = createNamespace({
        key1: {
          value: 'value1',
          expiration: -1,
          metadata: { testing: 1 },
        },
        key2: {
          value: 'value2',
          expiration: -1,
          metadata: { testing: 2 },
        },
        key3: {
          value: 'value3',
          expiration: -1,
          metadata: { testing: 3 },
        },
      });
      expect(await ns.list()).toEqual({
        keys: [
          { name: 'key1', metadata: { testing: 1 } },
          { name: 'key2', metadata: { testing: 2 } },
          { name: 'key3', metadata: { testing: 3 } },
        ],
        list_complete: true,
        cursor: '',
      });
    });

    test('it lists keys with expiration', async () => {
      KVNamespace.getTimestamp = () => 500;
      const [ns] = createNamespace({
        key1: {
          value: 'value1',
          expiration: 1000,
          metadata: null,
        },
        key2: {
          value: 'value2',
          expiration: 2000,
          metadata: null,
        },
        key3: {
          value: 'value3',
          expiration: 3000,
          metadata: null,
        },
      });
      expect(await ns.list()).toEqual({
        keys: [
          { name: 'key1', expiration: 1000 },
          { name: 'key2', expiration: 2000 },
          { name: 'key3', expiration: 3000 },
        ],
        list_complete: true,
        cursor: '',
      });
    });

    test('it lists keys with metadata and expiration', async () => {
      KVNamespace.getTimestamp = () => 500;
      const [ns] = createNamespace({
        key1: {
          value: 'value1',
          expiration: 1000,
          metadata: { testing: 1 },
        },
        key2: {
          value: 'value2',
          expiration: 2000,
          metadata: { testing: 2 },
        },
        key3: {
          value: 'value3',
          expiration: 3000,
          metadata: { testing: 3 },
        },
      });
      expect(await ns.list()).toEqual({
        keys: [
          { name: 'key1', expiration: 1000, metadata: { testing: 1 } },
          { name: 'key2', expiration: 2000, metadata: { testing: 2 } },
          { name: 'key3', expiration: 3000, metadata: { testing: 3 } },
        ],
        list_complete: true,
        cursor: '',
      });
    });

    test('it ignores and removes expired keys', async () => {
      const [ns] = createNamespace({
        key1: {
          value: 'value1',
          expiration: 1000,
          metadata: null,
        },
        key2: {
          value: 'value2',
          expiration: 2000,
          metadata: null,
        },
        key3: {
          value: 'value3',
          expiration: 3000,
          metadata: null,
        },
      });
      expect(await ns.list()).toEqual({
        keys: [],
        list_complete: true,
        cursor: '',
      });
    });

    test('it paginates keys', async () => {
      const [ns] = createNamespace({
        key1: {
          value: 'value1',
          expiration: -1,
          metadata: null,
        },
        key2: {
          value: 'value2',
          expiration: -1,
          metadata: null,
        },
        key3: {
          value: 'value3',
          expiration: -1,
          metadata: null,
        },
      });
      const { keys, list_complete, cursor } = await ns.list({ limit: 2 });
      expect({ keys, list_complete }).toEqual({
        keys: [{ name: 'key1' }, { name: 'key2' }],
        list_complete: false,
      });
      expect(cursor).not.toBe('');
      expect(await ns.list({ limit: 2, cursor })).toEqual({
        keys: [{ name: 'key3' }],
        list_complete: true,
        cursor: '',
      });
    });

    test('it paginates keys matching prefix', async () => {
      const [ns] = createNamespace({
        section1key1: {
          value: 'value11',
          expiration: -1,
          metadata: null,
        },
        section1key2: {
          value: 'value12',
          expiration: -1,
          metadata: null,
        },
        section1key3: {
          value: 'value13',
          expiration: -1,
          metadata: null,
        },
        section2key1: {
          value: 'value21',
          expiration: -1,
          metadata: null,
        },
      });
      const { keys, list_complete, cursor } = await ns.list({ prefix: 'section1', limit: 2 });
      expect({ keys, list_complete }).toEqual({
        keys: [{ name: 'section1key1' }, { name: 'section1key2' }],
        list_complete: false,
      });
      expect(cursor).not.toBe('');
      expect(await ns.list({ prefix: 'section1', limit: 2, cursor })).toEqual({
        keys: [{ name: 'section1key3' }],
        list_complete: true,
        cursor: '',
      });
    });

    test('it returns an empty list with no keys', async () => {
      const [ns] = createNamespace();
      expect(await ns.list()).toEqual({
        keys: [],
        list_complete: true,
        cursor: '',
      });
    });

    test('it returns an empty list with no matching keys', async () => {
      const [ns] = createNamespace({
        key1: {
          value: 'value1',
          expiration: -1,
          metadata: null,
        },
        key2: {
          value: 'value2',
          expiration: -1,
          metadata: null,
        },
        key3: {
          value: 'value3',
          expiration: -1,
          metadata: null,
        },
      });
      expect(await ns.list({ prefix: 'none' })).toEqual({
        keys: [],
        list_complete: true,
        cursor: '',
      });
    });
  });
});
