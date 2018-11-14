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

    beforeAll(async function() {
      const upstreamApp = express();
      upstreamApp.get("/success", (req, res) => res.send("OK"));
      upstreamApp.get("/redirect", (req, res) => res.redirect(301, "https://www.google.com"));
      upstreamApp.get("/host", (req, res) => res.send(req.hostname));

      await new Promise(resolve => {
        upstreamServer = upstreamApp.listen(resolve);
      });

      upstreamHost = `127.0.0.1:${upstreamServer.address().port}`;
    });

    test("It Fetches Correctly", async done => {
      const worker = new Worker("");
      const response = await worker.executeFetchEvent(`http://${upstreamHost}/success`);
      expect(response.status).toBe(200);
      expect(await response.text()).toBe("OK");
      done();
    });

    test("It does not follow redirects", async done => {
      const worker = new Worker("");
      const response = await worker.executeFetchEvent(`http://${upstreamHost}/redirect`);
      expect(response.status).toBe(301);
      expect(response.headers.get("Location")).toBe("https://www.google.com/");
      done();
    });

    test("The worker forwards the request upstream", async done => {
      const worker = new Worker("", {
        srcHost: "foo.com",
        dstHost: upstreamHost
      });
      const response = await worker.executeFetchEvent(`http://foo.com/success`);
      expect(response.status).toBe(200);
      expect(await response.text()).toBe("OK");
      done();
    });

    test("The worker does not keeps the host the same", async done => {
      const worker = new Worker("", {
        srcHost: "foo.com",
        dstHost: upstreamHost
      });
      const response = await worker.executeFetchEvent(`http://foo.com/host`);
      expect(response.status).toBe(200);
      expect(await response.text()).toBe("foo.com");
      done();
    });

    afterAll(async function() {
      upstreamServer.close();
    });
  });
});
