const cluster = require("cluster");
const process = require("process");
const fs = require("fs");

if(process.argv.length != 5) {
  console.log("Usage: cloudflare-worker-local /path/to/worker.js host.to.forward.request.to:3000 <port-to-run-on>");
  process.exit(-1);
}

if (cluster.isMaster) {
  for (var i = 0; i < 4; i++) {
    cluster.fork();
  }
  cluster.on("exit", function(worker, code, signal) {
    console.log("worker " + worker.process.pid + " died");
    cluster.fork();
  });
} else {
  const { createApp } = require("./app/server.js");
  const port = process.argv[4];
  const app = createApp(fs.readFileSync(process.argv[2]), { upstreamHost: process.argv[3] });

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
