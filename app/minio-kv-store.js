const Minio = require('minio');
const { KVNamespace } = require('./kv-namespace');

class MinioKVStore {
  constructor(client) {
    if (!client instanceof Minio.Client) throw new Error('client must be configured instance of Minio.Client');
    this.client = client;
  }

  getClient(namespace) {
    // Make sure the namespace is a valid bucket name
    namespace = namespace.trim().toLowerCase().replace(/_/g, '-').toString();
    const bucketPromise = (async () => {
      if (!(await this.client.bucketExists(namespace))) await this.client.makeBucket(namespace);
    })();

    return new KVNamespace({
      getter: async (key) => {
        await bucketPromise;
        return new Promise(async (resolve, reject) => {
          try {
            // Get expiration and metadata
            const stat = await this.client.statObject(namespace, key);
            let expiration = parseInt(stat.metaData.expiration);
            if (isNaN(expiration)) expiration = -1;
            const metadata = JSON.parse(stat.metaData.metadata);

            // Get value
            let value = '';
            const stream = await this.client.getObject(namespace, key);
            stream.on('data', (chunk) => (value += chunk.toString('utf8')));
            stream.on('error', reject);
            stream.on('end', () => resolve({ value, expiration, metadata }));
          } catch (e) {
            if (e.code === 'NotFound' || e.code === 'NoSuchKey') {
              resolve(null);
            } else {
              reject(e);
            }
          }
        });
      },
      putter: async (key, { value, expiration, metadata }) => {
        await bucketPromise;
        return this.client.putObject(namespace, key, value, undefined, {
          // Minio metadata values need to be strings
          expiration: expiration.toString(),
          metadata: JSON.stringify(metadata),
        });
      },
      remover: async (key) => {
        await bucketPromise;
        return this.client.removeObject(namespace, key);
      },
      lister: async (prefix, limit, start) => {
        await bucketPromise;
        return new Promise(async (resolve, reject) => {
          // The `true` here enables recursive mode, ensuring keys containing '/' are returned
          const stream = await this.client.extensions.listObjectsV2WithMetadata(namespace, prefix, true, start);
          const objects = [];
          let next = '';
          stream.on('data', (object) => {
            if (objects.length >= limit) {
              // If this pushes us over the limit, set next and stop reading more objects
              if (next === '') {
                next = objects[objects.length - 1][0];
                stream.destroy();
              }
              return;
            }

            // Default metadata
            const value = { expiration: -1, metadata: null };
            if (object.metadata) {
              // listObjectsV2WithMetadata returns metadata in HTTP header format.
              // Custom headers are prefixed with "X-Amz-Meta-".
              // Each header key maps to an array, which will always be length 1 for us.
              if (object.metadata['X-Amz-Meta-Expiration']) {
                const expiration = parseInt(object.metadata['X-Amz-Meta-Expiration'][0]);
                if (!isNaN(expiration)) value.expiration = expiration;
              }
              if (object.metadata['X-Amz-Meta-Metadata']) {
                value.metadata = JSON.parse(object.metadata['X-Amz-Meta-Metadata'][0]);
              }
            }
            // Add object in the form [key, { expiration, metadata }]
            objects.push([object.name, value]);
          });
          stream.on('error', reject);
          // Once all objects have been processed, resolve with the array
          stream.on('end', () => resolve({ keys: objects, next }));
        });
      },
    });
  }
}

function getEnvOpts(env) {
  const opts = {
    endPoint: env.MINIO_ENDPOINT,
    port: env.MINIO_PORT || 9000,
    useSSL: (env.MINIO_USE_SSL !== 'false'),
    accessKey: env.MINIO_ACCESS_KEY,
    secretKey: env.MINIO_SECRET_KEY
  };
  if (env.MINIO_REGION) opts.region = env.MINIO_REGION;
  if (env.MINIO_TRANSPORT) opts.transport = env.MINIO_TRANSPORT;
  if (env.MINIO_SESSIONTOKEN) opts.sessionToken = env.MINIO_SESSIONTOKEN;
  if (env.MINIO_PARTSIZE) opts.partSize = env.MINIO_PARTSIZE;

  for (const [k, v] of Object.entries(opts)) {
    if (v === undefined) throw new Error(`Minio argument: ${k} missing`);
  }
  return opts;
}

module.exports = { MinioKVStore, Minio, getEnvOpts };
