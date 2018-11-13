const express = require("express");

function createApp() {
  const app = express();
  return app;
}

module.exports = {
  createApp
};
