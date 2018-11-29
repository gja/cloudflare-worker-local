const express = require("express");
const { Worker } = require("../worker");

describe("Workers", () => {
  test("It Can Create and Execute a Listener", () => {
    const worker = new Worker("foo.com", 'addEventListener("add", (a, b) => a + b)');
    expect(worker.triggerEvent("add", 1, 2)).toBe(3);
  });

  describe("Ensuring Things are in scope", () => {
    test("It has Node buildins like Object in scope", () => {
      const worker = new Worker("foo.com", 'addEventListener("test", () => Object.assign({}, {foo: "bar"}))');
      expect(worker.triggerEvent("test").foo).toBe("bar");
    });

    test("It has Fetch buildins like Request in scope", () => {
      const worker = new Worker("foo.com", 'addEventListener("test", () => new Request())');
      expect(worker.triggerEvent("test").method).toBe("GET");
    });

    test("It has support for WHATWG URLs", () => {
      const worker = new Worker(
        "foo.com",
        'addEventListener("test", () => new URL("https://www.cloudflare.com/api?foo=bar"))'
      );
      const url = worker.triggerEvent("test");
      expect(url.hostname).toBe("www.cloudflare.com");
      expect(url.pathname).toBe("/api");
      expect(url.searchParams.get("foo")).toBe("bar");
    });

    test('It has support for base64 encoding APIs', () => {
      const worker = new Worker(
        'foo.com',
        `addEventListener('test', () => ({ encoded: btoa('test'), decoded: atob('dGVzdA==') }))`
      );
      const { encoded, decoded } = worker.triggerEvent('test');
      expect(encoded).toBe('dGVzdA==');
      expect(decoded).toBe('test')
    });

    test('It has support for crypto and Text encoding APIs', async () => {
      const worker = new Worker(
        'foo.com',
        `addEventListener('test', async () => {
          const password = 'test';
          const plainText = 'foo';
          const ptUtf8 = new TextEncoder().encode(plainText);
          const pwUtf8 = new TextEncoder().encode(password);
          const pwHash = await crypto.subtle.digest('SHA-256', pwUtf8); 
          const iv = crypto.getRandomValues(new Uint8Array(12));
          const alg = { name: 'AES-GCM', iv: iv };
          const encKey = await crypto.subtle.importKey('raw', pwHash, alg, false, ['encrypt']);
          const encBuffer = await crypto.subtle.encrypt(alg, encKey, ptUtf8);
          const decKey = await crypto.subtle.importKey('raw', pwHash, alg, false, ['decrypt']);
          const ptBuffer = await crypto.subtle.decrypt(alg, decKey, encBuffer);
          const plainText2 = new TextDecoder().decode(ptBuffer);
          return plainText === plainText2;
        })`
      );
      const decrypted = await worker.triggerEvent('test');
      expect(decrypted).toBe(true);
    });

    test('It has support for the console API', () => {
      const worker = new Worker(
        'foo.com',
        `addEventListener('test', () => console.log('test'))`
      );
      const spy = jest.spyOn(console, 'log');
      worker.triggerEvent('test');
      expect(spy).toHaveBeenCalledWith('test');
    });
  });

  test("It can stub out responses", async () => {
    const worker = new Worker("foo.com", 'addEventListener("fetch", (e) => e.respondWith(new Response("hello")))');
    const response = await worker.executeFetchEvent("http://foo.com");
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("hello");
  });

  describe("Fetch Behavior", () => {
    let upstreamServer;
    let upstreamHost;

    beforeAll(async function() {
      const upstreamApp = express();
      upstreamApp.get("/success", (req, res) => res.send("OK"));
      upstreamApp.get("/redirect", (req, res) => res.redirect(301, "https://www.google.com"));
      upstreamApp.get("/host", (req, res) => res.send(req.headers.host));

      await new Promise(resolve => {
        upstreamServer = upstreamApp.listen(resolve);
      });

      upstreamHost = `127.0.0.1:${upstreamServer.address().port}`;
    });

    test("It Fetches Correctly", async done => {
      const worker = new Worker(upstreamHost, "", { upstreamHost: upstreamHost });
      const response = await worker.executeFetchEvent(`http://${upstreamHost}/success`);
      expect(response.status).toBe(200);
      expect(await response.text()).toBe("OK");
      done();
    });

    test("It does not follow redirects", async done => {
      const worker = new Worker(upstreamHost, "", { upstreamHost: upstreamHost });
      const response = await worker.executeFetchEvent(`http://${upstreamHost}/redirect`);
      expect(response.status).toBe(301);
      expect(response.headers.get("Location")).toBe("https://www.google.com/");
      done();
    });

    test("The worker forwards the request upstream", async done => {
      const worker = new Worker("foo.com", "", { upstreamHost: upstreamHost });
      const response = await worker.executeFetchEvent(`http://foo.com/success`);
      expect(response.status).toBe(200);
      expect(await response.text()).toBe("OK");
      done();
    });

    test("The worker does not keeps the host the same", async done => {
      const worker = new Worker("foo.com", "", { upstreamHost: upstreamHost });
      const response = await worker.executeFetchEvent(`http://foo.com/host`);
      expect(response.status).toBe(200);
      expect(await response.text()).toBe("foo.com");
      done();
    });

    test("It does not forward to the upstream host if the hostname is not the same", async done => {
      const worker = new Worker(
        "foo.com",
        `addEventListener("fetch", (e) => e.respondWith(fetch("http://${upstreamHost}/host")))`,
        { upstreamHost: null }
      );
      const response = await worker.executeFetchEvent(`http://foo.com/host`);
      expect(response.status).toBe(200);
      expect(await response.text()).toBe(upstreamHost);
      done();
    });

    afterAll(async function() {
      upstreamServer.close();
    });
  });
});
