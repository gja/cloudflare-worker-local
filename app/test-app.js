const { createApp } = require("./server");
const http = require("http");

function createTestApp(workerContent, upstreamApp, opts = {}) {
  const app = createApp(workerContent, opts);
  const server = http.createServer(app);
  const upstreamServer = http.createServer(upstreamApp);

  server.listen = function() {
    upstreamServer.listen(0);
    app.updateOpts({ upstreamHost: `127.0.0.1:${upstreamServer.address().port}` });
    return http.Server.prototype.listen.apply(this, arguments);
  };

  server.close = function() {
    upstreamServer.close();
    return http.Server.prototype.close.apply(this, arguments);
  };

  return server;
}

module.exports = { createTestApp };
