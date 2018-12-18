const express = require("express");
const bodyParser = require("body-parser");
const { Worker } = require("./worker");
const { InMemoryKVStore } = require("./in-memory-kv-store");

async function callWorker(worker, req, res) {
  const url = req.protocol + "://" + req.get("host") + req.originalUrl;

  const response = await worker.executeFetchEvent(url, {
    headers: req.headers,
    method: req.method,
    body: ["GET", "HEAD"].includes(req.method) ? undefined : req.body,
    ip: req.connection.remoteAddress.split(":").pop()
  });
  const data = await response.arrayBuffer();

  res.status(response.status);
  for (var pair of response.headers) {
    res.set(pair[0], pair[1]);
  }
  res.end(Buffer.from(data), "binary");
}

function createApp(workerContent, opts) {
  let workersByOrigin = {};
  const kvStoreFactory = new InMemoryKVStore();
  const app = express();
  app.use(bodyParser.raw({ type: "*/*" }));
  app.use(async (req, res) => {
    try {
      const origin = req.headers.host;
      workersByOrigin[origin] =
        workersByOrigin[origin] || new Worker(origin, workerContent, { kvStoreFactory, ...opts });
      const worker = workersByOrigin[origin];
      await callWorker(worker, req, res);
    } catch (e) {
      console.warn(e);
      res.status(520);
      res.end("Something Went Wrong!");
    }
  });
  app.updateWorker = contents => {
    workerContent = contents;
    workersByOrigin = {};
  };

  return app;
}

module.exports = { createApp };
