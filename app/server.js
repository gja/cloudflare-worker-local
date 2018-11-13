const express = require("express");
const bodyParser = require("body-parser");
const { Worker } = require("./worker");

async function callWorker(worker, req, res) {
  const url = req.protocol + "://" + req.get("host") + req.originalUrl;

  const response = await worker.executeFetchEvent(url, {
    headers: req.headers,
    method: req.method,
    body: ["GET", "HEAD"].includes(req.method) ? undefined : req.body
  });
  const data = await response.arrayBuffer();

  res.status(response.status);
  for (var pair of response.headers) {
    res.set(pair[0], pair[1]);
  }
  res.end(Buffer.from(data), "binary");
}

function createApp(workerContent, opts) {
  const worker = new Worker(workerContent, opts);
  const app = express();
  app.use(bodyParser.raw({ type: "*/*" }));
  app.use((req, res) => callWorker(worker, req, res));
  return app;
}

module.exports = { createApp };
