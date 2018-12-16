const express = require("express");
const { Request } = require("node-fetch");
const bodyParser = require("body-parser");
const { Worker } = require("./worker");
const { InMemoryKVStore } = require("./in-memory-kv-store");

function buildRequest(req) {
  const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress.split(':').pop();
  return new Request(url, {
    headers: {
      ...req.headers,
      'cf-connecting-ip': ip,
      'cf-ipcountry': 'XX',
      'cf-ray': '0000000000000000',
      'cf-visitor': JSON.stringify({ scheme: req.protocol }),
      'x-forwarded-proto': req.protocol,
      'x-real-ip': ip
    },
    method: req.method,
    body: ['GET', 'HEAD'].includes(req.method) ? undefined : req.body
  });
}

async function callWorker(worker, req, res) {
  const request = buildRequest(req);
  const response = await worker.executeFetchEvent(request);
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
