const cluster = require("cluster");
const process = require("process");
const fs = require("fs");

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
  const app = createApp(fs.readFileSync(process.argv[2]), {
    forwardHost: process.argv[3]
  });

  try {
    app.listen(process.argv[4], function() {
      console.log(`Example app listening on port ${process.argv[4]}!`);
    });
  } catch (e) {
    console.error("Worker died - Aborting");
    console.error(e.stack);
    cluster.worker.disconnect();
    process.exit();
  }
}
