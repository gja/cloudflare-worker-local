const fs = require("fs");
const cluster = require("cluster");
const process = require("process");
const wrangler = require("./lib/wrangler");

const { InMemoryKVStore } = require("./app/in-memory-kv-store");
const { FileKVStore } = require("./app/file-kv-store");

if (process.argv.length < 5) {
  console.log("Usage: cloudflare-worker-local /path/to/worker.js host.to.forward.request.to:3000 <port-to-run-on> [/path/to/wrangler.toml [env]]");
  process.exit(-1);
}

let kvStore = ()=>new InMemoryKVStore();
if (process.env.MINIO_ENDPOINT) {
  const { MinioKVStore, Minio, getEnvOpts } = require('./app/minio-kv-store');
  kvStore = ()=>new MinioKVStore(new Minio.Client(getEnvOpts(process.env)));
}
if (process.env.KV_FILE_ROOT) {
  kvStore = ()=>new FileKVStore(process.env.KV_FILE_ROOT);
}

if (cluster.isMaster) {
  for (var i = 0; i < (process.env.NUM_WORKERS || 1); i++) {
    cluster.fork();
  }

  process.on("SIGHUP", () => {
    for (let i in cluster.workers) {
      cluster.workers[i].process.kill("SIGHUP");
    }
  });

  cluster.on("exit", function(worker, code, signal) {
    console.log("worker " + worker.process.pid + " died");
    cluster.fork();
  });
} else {
  const { createApp } = require(".");
  const port = process.argv[4];
  // .split(",") will return [""] when KV_NAMESPACES isn't set, so filter out empty strings
  let kvStores = (process.env.KV_NAMESPACES || "").split(",").filter(name => name !== "");
  let env = {};
  if (process.argv[5]) {
    // Import config from provided wrangler.toml
    const config = wrangler.loadConfig(process.argv[5], process.argv[6]);
    wrangler.toJSON(config);
    env = {...config.vars, ...config.secrets};
    if (Array.isArray(config['kv-namespaces'])) kvStores = kvStores.concat(config['kv-namespaces'].map(n=>n.binding));
    // Add Workers Sites KV namespace and manifest to env if it's enabled
    if (config.site && config.site.bucket) {
      console.log(`Serving Workers Site from ${config.site.bucket}`);
      // Workers Sites expects a KV namespace named __STATIC_CONTENT mapping file name keys to contents
      env["__STATIC_CONTENT"] = new FileKVStore().getClient(config.site.bucket);
      // Workers Sites also expects an object named __STATIC_CONTENT_MANIFEST mapping file names to file names
      // containing an asset hash for edge caching. Since we stub caching out, we can just use the original file name
      // as the file name with hash, so we set this to a proxy with returns a value equal to each requested key.
      env["__STATIC_CONTENT_MANIFEST"] = "{}"; // Empty static content // new Proxy({}, {get: (target, prop) => prop});
    }
  }
  const opts = { upstreamHost: process.argv[3], kvStores, kvStore, env };
  const app = createApp(fs.readFileSync(process.argv[2]), opts);

  process.on("SIGHUP", () => {
    fs.readFile(process.argv[2], (_, newWorkerContent) => {
      console.log("Updating Worker");
      app.updateWorker(newWorkerContent);
    });
  });

  try {
    app.listen(port, function() {
      console.log(`Example app listening on port ${port}!`);
    });
  } catch (e) {
    console.error("Worker died - Aborting");
    console.error(e.stack);
    cluster.worker.disconnect();
    process.exit();
  }
}
