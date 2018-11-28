const cluster = require("cluster");
const process = require("process");
const fs = require("fs");

if (process.argv.length != 5) {
  console.log("Usage: cloudflare-worker-local /path/to/worker.js host.to.forward.request.to:3000 <port-to-run-on>");
  process.exit(-1);
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
  const { createApp } = require("./app/server.js");
  const port = process.argv[4];
  const opts = { upstreamHost: process.argv[3], kvStores: (process.env.KV_NAMESPACES || "").split(",") };
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
