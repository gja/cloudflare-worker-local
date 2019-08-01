const express = require("express");
const { Worker } = require("../worker");
const { InMemoryKVStore } = require("../in-memory-kv-store");
const { Headers } = require("node-fetch");

describe("Workers", () => {
  test("It Can Create and Execute a Listener", () => {
    const worker = new Worker("foo.com", 'addEventListener("add", (a, b) => a + b)');
    expect(worker.triggerEvent("add", 1, 2)).toBe(3);
  });

  describe("Ensuring Things are in scope", () => {
    test("It has self global", () => {
      const worker = new Worker("foo.com", `addEventListener('test', () => self)`);
      const self = worker.triggerEvent("test");
      expect(self).toBeDefined();
    });

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

    test("It has support for URLSearchParams", () => {
      const worker = new Worker("foo.com", `addEventListener('test', () => new URLSearchParams({ foo: 'bar' }))`);
      const params = worker.triggerEvent("test");
      expect(params.has("foo")).toBe(true);
      expect(params.get("foo")).toBe("bar");
      expect(params.has("baz")).toBe(false);
      expect(params.get("baz")).toBe(null);
    });

    test("It has support for base64 encoding APIs", () => {
      const worker = new Worker(
        "foo.com",
        `addEventListener('test', () => ({ encoded: btoa('test'), decoded: atob('dGVzdA==') }))`
      );
      const { encoded, decoded } = worker.triggerEvent("test");
      expect(encoded).toBe("dGVzdA==");
      expect(decoded).toBe("test");
    });

    test("It has support for delayed promises with setTimeout", async () => {
      const worker = new Worker(
        "foo.com",
        `addEventListener('test', () => new Promise(resolve => setTimeout(() => resolve(42), 100)))`
      );
      const result = await worker.triggerEvent("test");
      expect(result).toBe(42);
    })

    test("It has support for crypto and Text encoding APIs", async () => {
      const worker = new Worker(
        "foo.com",
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
      const decrypted = await worker.triggerEvent("test");
      expect(decrypted).toBe(true);
    });

    test("It has support for the console API", () => {
      const worker = new Worker("foo.com", `addEventListener('test', () => console.log('test'))`);
      const spy = jest.spyOn(console, "log");
      worker.triggerEvent("test");
      expect(spy).toHaveBeenCalledWith("test");
    });
  });

  test("It can stub out responses", async () => {
    const worker = new Worker("foo.com", 'addEventListener("fetch", (e) => e.respondWith(new Response("hello")))');
    const response = await worker.executeFetchEvent("http://foo.com");
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("hello");
  });

  describe("Cloudflare Headers", () => {
    it("Adds cloudflare headers", async () => {
      const worker = new Worker(
        "foo.com",
        'addEventListener("fetch", (e) => e.respondWith(new Response("hello", {headers: e.request.headers})))'
      );
      const response = await worker.executeFetchEvent("http://foo.com");
      expect(response.headers.get("CF-Ray")).toBe("0000000000000000");
      expect(response.headers.get("CF-Visitor")).toBe('{"scheme":"http"}');
      expect(response.headers.get("CF-IPCountry")).toBe("DEV");
      expect(response.headers.get("CF-Connecting-IP")).toBe("127.0.0.1");
      expect(response.headers.get("X-Real-IP")).toBe("127.0.0.1");

      expect(response.headers.get("X-Forwarded-For")).toBe("127.0.0.1");
      expect(response.headers.get("X-Forwarded-Proto")).toBe("http");
    });

    it("correctly appends to X-Forwarded-*", async () => {
      const worker = new Worker(
        "foo.com",
        'addEventListener("fetch", (e) => e.respondWith(new Response("hello", {headers: e.request.headers})))'
      );
      const response = await worker.executeFetchEvent("http://foo.com", {
        headers: new Headers({
          "X-Forwarded-For": "8.8.8.8",
          "X-Forwarded-Proto": "https"
        })
      });
      expect(response.headers.get("X-Forwarded-For")).toBe("8.8.8.8, 127.0.0.1");
      expect(response.headers.get("X-Forwarded-Proto")).toBe("https, http");
    });
  });

  describe("Fetch Behavior", () => {
    let upstreamServer;
    let upstreamHost;

    beforeAll(async function() {
      const upstreamApp = express();
      upstreamApp.get("/success", (req, res) => res.send("OK"));
      upstreamApp.get("/redirect", (req, res) => res.redirect(301, "https://www.google.com"));
      upstreamApp.get("/host", (req, res) => res.send(req.headers.host));
      upstreamApp.get("/cacheable", (req, res) => res.set(req.headers).send());

      await new Promise(resolve => {
        upstreamServer = upstreamApp.listen(resolve);
      });

      upstreamHost = `127.0.0.1:${upstreamServer.address().port}`;
    });

    test("It Fetches Correctly", async () => {
      const worker = new Worker(upstreamHost, "", { upstreamHost: upstreamHost });
      const response = await worker.executeFetchEvent(`http://${upstreamHost}/success`);
      expect(response.status).toBe(200);
      expect(await response.text()).toBe("OK");
    });

    test("It does not follow redirects", async () => {
      const worker = new Worker(upstreamHost, "", { upstreamHost: upstreamHost });
      const response = await worker.executeFetchEvent(`http://${upstreamHost}/redirect`);
      expect(response.status).toBe(301);
      expect(response.headers.get("Location")).toBe("https://www.google.com/");
    });

    test("The worker forwards the request upstream", async () => {
      const worker = new Worker("foo.com", "", { upstreamHost: upstreamHost });
      const response = await worker.executeFetchEvent(`http://foo.com/success`);
      expect(response.status).toBe(200);
      expect(await response.text()).toBe("OK");
    });

    test("The worker does not keeps the host the same", async () => {
      const worker = new Worker("foo.com", "", { upstreamHost: upstreamHost });
      const response = await worker.executeFetchEvent(`http://foo.com/host`);
      expect(response.status).toBe(200);
      expect(await response.text()).toBe("foo.com");
    });

    test("It does not forward to the upstream host if the hostname is not the same", async () => {
      const worker = new Worker(
        "foo.com",
        `addEventListener("fetch", (e) => e.respondWith(fetch("http://${upstreamHost}/host")))`,
        { upstreamHost: null }
      );
      const response = await worker.executeFetchEvent(`http://foo.com/host`);
      expect(response.status).toBe(200);
      expect(await response.text()).toBe(upstreamHost);
    });

    it("It forwards cache control headers", async () => {
      const worker = new Worker(
        "foo.com",
        `addEventListener("fetch", (e) => e.respondWith(fetch("http://${upstreamHost}/cacheable", { cf: {
          cacheKey: "foo",
          cacheEverything: true,
          cacheTtl: 300
        } })))`
      );
      const response = await worker.executeFetchEvent("http://foo.com/cacheable");
      expect(await response.headers.get("cf-cache-key")).toBe("foo");
      expect(await response.headers.get("cf-cache-everything")).toBe("true");
      expect(await response.headers.get("cf-cache-ttl")).toBe("300");
    });

    test("It can save things into the KV store", async () => {
      const kvStoreFactory = new InMemoryKVStore();
      const worker = new Worker(
        "foo.com",
        `addEventListener("fetch", (e) => {e.respondWith(new Response("foo")); e.waitUntil(MYSTORE.put("foo", "bar"))})`,
        { kvStores: { MYSTORE: kvStoreFactory.getClient("MYSTORE") } }
      );

      const response = await worker.executeFetchEvent(`http://foo.com/blah`);
      expect(response.status).toBe(200);
      expect(await response.text()).toBe("foo");
      expect(await kvStoreFactory.getClient("MYSTORE").get("foo")).toBe("bar");
      await kvStoreFactory.getClient("MYSTORE").delete("foo");
      expect(await kvStoreFactory.getClient("MYSTORE").get("foo")).toBe(undefined);
    });

    test("It fetches directly from origin is passThroughOnException() is called", async () => {
      const worker = new Worker(
        upstreamHost,
        `addEventListener("fetch", (e) => {e.passThroughOnException(); throw "An exception from worker!"})`,
        { upstreamHost: upstreamHost }
      );
      const response = await worker.executeFetchEvent(`http://${upstreamHost}/success`);
      expect(response.status).toBe(200);
    });

    test("It does not quietly eat runtion exceptions", async () => {
      const worker = new Worker(
        upstreamHost,
        `addEventListener("fetch", (e) => {throw "An exception from worker!"})`,
        { upstreamHost: upstreamHost }
      );
      try {
        const response = await worker.executeFetchEvent(`http://${upstreamHost}/success`);
      } catch(ex) {
        expect(ex).toBe("An exception from worker!");
      }
    });

    afterAll(async function() {
      upstreamServer.close();
    });
  });
});
