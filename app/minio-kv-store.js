const Minio = require('minio');

class MinioKVStore {
  constructor(client) {
    if (!client instanceof Minio.Client) throw new Error('client must be configured instance of Minio.Client');
    this.client = client;
  }

  getClient(namespace) {
    const bucketPromise = async function() {
      if (!await this.client.bucketExists(namespace))
          await this.client.makeBucket(namespace);
    }();
    return {
      get: async key => {await bucketPromise; return JSON.parse((await this.client.getObject(namespace, key)).json())},
      put: async (key, value) => {await bucketPromise; return this.client.putObject(namespace, key, JSON.stringify(value))},
      delete: async key => {await bucketPromise; return this.client.removeObject(namespace, key)}
    };
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
