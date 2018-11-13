const express = require('express');
const { Worker } = require("./worker");

function createApp(workerContents, forwardRequestsToHost) {
  const app = express();
  return app;
}

module.exports = {
  createApp
}
