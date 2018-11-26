const express = require("express");
const { Worker } = require("../worker");

describe("Workers", () => {
  test("It Can Create and Execute a Listener", () => {
    const worker = new Worker('addEventListener("add", (a, b) => a + b)');
    expect(worker.triggerEvent("add", 1, 2)).toBe(3);
  });

  describe("Ensuring Things are in scope", () => {
    test("It has Node buildins like Object in scope", () => {
      const worker = new Worker('addEventListener("test", () => Object.assign({}, {foo: "bar"}))');
      expect(worker.triggerEvent("test").foo).toBe("bar");
    });

    test("It has Fetch buildins like Request in scope", () => {
      const worker = new Worker('addEventListener("test", () => new Request())');
      expect(worker.triggerEvent("test").method).toBe("GET");
    });

    test("It has support for WHATWG URLs", () => {
      const worker = new Worker('addEventListener("test", () => new URL("https://www.cloudflare.com/api?foo=bar"))');
      const url = worker.triggerEvent("test");
      expect(url.hostname).toBe("www.cloudflare.com");
      expect(url.pathname).toBe("/api");
      expect(url.searchParams.get("foo")).toBe("bar");
    });
  });

  test("It can stub out responses", async () => {
    const worker = new Worker('addEventListener("fetch", (e) => e.respondWith(new Response("hello")))');
    const response = await worker.executeFetchEvent("http://foo.com");
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("hello");
  });

  describe("Fetch Behavior", () => {
    var upstreamServer;
    var upstreamHost;
    const port = 3000; // https://www.npmjs.com/package/get-port ?
    const host = `localhost:${port}`;
    let otherServer;
    let otherHost;

    beforeAll(async function() {
      const upstreamApp = express();
      upstreamApp.get("/success", (req, res) => res.send("OK"));
      upstreamApp.get("/redirect", (req, res) => res.redirect(301, "https://www.google.com"));
      upstreamApp.get("/host", (req, res) => res.send(req.headers.host));

      await new Promise(resolve => {
        upstreamServer = upstreamApp.listen(resolve);
      });

      upstreamHost = `127.0.0.1:${upstreamServer.address().port}`;

      const otherApp = express();
      otherApp.get("/teapot", (req, res) => res.send(418, "I'm a teapot"));
      await new Promise(resolve => {
        otherServer = otherApp.listen(resolve);
      });
      otherHost = `127.0.0.1:${otherServer.address().port}`;
    });

    test("It Fetches Correctly", async done => {
      const worker = new Worker("", { upstreamHost, port });
      const response = await worker.executeFetchEvent(`http://${host}/success`);
      expect(response.status).toBe(200);
      expect(await response.text()).toBe("OK");
      done();
    });

    test("It does not follow redirects", async done => {
      const worker = new Worker("", { upstreamHost, port });
      const response = await worker.executeFetchEvent(`http://${host}/redirect`);
      expect(response.status).toBe(301);
      expect(response.headers.get("Location")).toBe("https://www.google.com/");
      done();
    });

    test("The worker forwards the request upstream", async done => {
      const worker = new Worker("", { upstreamHost, port });
      const response = await worker.executeFetchEvent(`http://${host}/success`);
      expect(response.status).toBe(200);
      expect(await response.text()).toBe("OK");
      done();
    });

    test("The worker does not keeps the host the same", async done => {
      const worker = new Worker("", { upstreamHost, port });
      const response = await worker.executeFetchEvent(`http://${host}/host`);
      expect(response.status).toBe(200);
      expect(await response.text()).toBe(host);
      done();
    });

    test("The worker can fetch other origins", async done => {
      const script = `addEventListener("fetch", e => e.respondWith(fetch('http://${otherHost}/teapot')))`;
      const worker = new Worker(script, { upstreamHost, port });
      const response = await worker.executeFetchEvent(`http://${host}/`);
      expect(response.status).toBe(418);
      expect(await response.text()).toBe("I'm a teapot");
      done();
    });

    afterAll(async function() {
      upstreamServer.close();
      otherServer.close();
    });
  });
});
