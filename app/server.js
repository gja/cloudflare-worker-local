const express = require("express");
const bodyParser = require("body-parser");
const { InMemoryKVStore } = require("./in-memory-kv-store");
const { Worker } = require("./worker");
const { pipeline } = require('stream');
const { promisify } = require('util');
const streamPipeline = promisify(pipeline);

async function callWorker(worker, req, res) {
  const url = req.protocol + "://" + req.get("host") + req.originalUrl;

  const response = await worker.executeFetchEvent(url, {
    headers: req.headers,
    method: req.method,
    body: ["GET", "HEAD"].includes(req.method) ? undefined : req.body,
    ip: req.connection.remoteAddress.split(":").pop()
  });

  res.status(response.status);
  for (var pair of response.headers) {
    res.set(pair[0], pair[1]);
  }
  
  //if body is a stream then stream it otherwise just return
  if (typeof response.body.on === 'function') {
    return streamPipeline(response.body, res);
  } else {
    const data = await response.arrayBuffer();
    res.end(Buffer.from(data), "binary");
  }
}

function buildKVStores(kvStoreFactory, kvStores) {
  return kvStores.reduce((acc, name) => {
    acc[name] = kvStoreFactory.getClient(name);
    return acc;
  }, {});
}

function createApp(workerContent, opts = {}) {
  let workersByOrigin = {};
  let kvStores;
  if (opts.kvStore) kvStores = buildKVStores(opts.kvStore(), opts.kvStores || []);
  else kvStores = buildKVStores(new InMemoryKVStore(), opts.kvStores || []);
  const app = express();
  app.use(bodyParser.raw({ type: "*/*", limit: "100GB" }));
  app.use(async (req, res) => {
    try {
      const origin = req.headers.host;
      workersByOrigin[origin] = workersByOrigin[origin] || new Worker(origin, workerContent, { ...opts, kvStores });
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
  app.updateOpts = newOpts => {
    opts = Object.assign({}, opts, newOpts);
    workersByOrigin = {};
  };
  app.stores = kvStores;

  return app;
}

module.exports = { createApp };
