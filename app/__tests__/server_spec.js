const { createApp } = require("../server");
const supertest = require("supertest");
const { MinioKVStore, Minio } = require("../minio-kv-store");
const wrangler = require("../../lib/wrangler");

describe("server", () => {
  it("returns the response from the worker", async () => {
    const app = createApp(
      'addEventListener("fetch", (e) => e.respondWith(new Response("hello", {status: 201, headers: {"Some-Header": "value"}})))'
    );

    await supertest(app)
      .get("/some-route")
      .expect(201, "hello")
      .expect("Some-Header", "value");
  });

  it("passes url related field to the header", async () => {
    const app = createApp(
      'addEventListener("fetch", (e) => e.respondWith(new Response(`${new URL(e.request.url).pathname}|${e.request.headers.get("Foo")}`)))'
    );

    await supertest(app)
      .get("/some-route")
      .set("Foo", "bar")
      .expect(200, `/some-route|bar`);
  });

  it("passes post information on", async () => {
    const app = createApp(
      'addEventListener("fetch", (e) => e.respondWith(e.request.text().then(text => new Response(`${e.request.method}|${text}`))))'
    );

    await supertest(app)
      .post("/some-route")
      .send("foo=bar")
      .expect(200, `POST|foo=bar`);
  });

  it("allows you to update the worker", async () => {
    const app = createApp('addEventListener("fetch", (e) => e.respondWith(new Response("goodbye")))');

    await supertest(app)
      .get("/some-route")
      .expect(200, "goodbye");
  });

  it("passes the current ip onwards", async () => {
    const app = createApp(
      'addEventListener("fetch", (e) => e.respondWith(new Response(e.request.headers.get("X-Forwarded-For"))))'
    );
    await supertest(app)
      .get("/some-route")
      .expect(200, "127.0.0.1");
  });

  it("creates stores and passes it to the worker", async () => {
    const app = createApp(
      'addEventListener("fetch", (e) => e.respondWith(MYSTORE.get("key").then(v => new Response(v))))',
      {
        kvStores: ["MYSTORE"]
      }
    );

    await app.stores.MYSTORE.put("key", "value");

    await supertest(app)
      .get("/some-route")
      .expect(200, "value");
  });

  it("can load CloudFlare 'environment variables' and 'secrets' from wrangler.toml", async () => {
    let kvStores = ["MYSTORE"]; // Check if stores somehow clobbered
    // Import config from provided wrangler.toml
    const config = wrangler.loadConfig(__dirname + "/../../examples/wrangler.toml");
    wrangler.toJSON(config);
    const env = {...config.vars, ...config.secrets};
    if (Array.isArray(config['kv-namespaces'])) kvStores = kvStores.concat(config['kv-namespaces'].map(n=>n.binding));
    const app = createApp(
      'addEventListener("fetch", (e) => e.respondWith(Promise.all([MYSTORE.get("key"), wranglerKV.get("key")]).then(([v, x]) => new Response(JSON.stringify({MYSTORE: v, wranglerKV: x, variable1, foo})))))',
      {
        kvStores,
        env
      }
    );

    await app.stores.MYSTORE.put("key", "value");
    await app.stores.wranglerKV.put("key", "value");

    await supertest(app)
      .get("/some-route")
      .expect(200, '{"MYSTORE":"value","wranglerKV":"value","variable1":"somevalue","foo":"{\\"bar\\":\\"shhh\\"}"}');
  });

  it("allows big post request", async () => {
    let body = "x"
    for (let i = 0; i < 20; i++) {
      body = body + body
    }

    const app = createApp(
      'addEventListener("fetch", (e) => e.respondWith(e.request.text().then(text => new Response(`${e.request.method}`))))'
    );

    await supertest(app)
      .post("/some-route")
      .send(body)
      .expect(200, 'POST');
  });

  it("can init a minio client", async () => {
    const app = createApp(
      'addEventListener("fetch", (e) => e.respondWith(new Response("success")))',
      {
        kvStore: ()=>new MinioKVStore(new Minio.Client({endPoint: 'localhost'})),
        kvStores: [] // leave this empty so the client doesn't attempt to make requests
      }
    );
  });

  it("config country overrides cf-ipcountry header ", async () => {
    const app = createApp(
      'addEventListener("fetch", (e) => e.respondWith(new Response("hello", {status: 200, headers: {"return-country": e.request.headers.get("cf-ipcountry")}})))',
      {country: 'some-country'}
    );

    await supertest(app)
      .get("/some-route")
      .expect(200, "hello")
      .expect("return-country", "some-country");
  });

  it("set DEV as cf-ipcountry header by default", async () => {
    const app = createApp(
      'addEventListener("fetch", (e) => e.respondWith(new Response("hello", {status: 200, headers: {"return-country": e.request.headers.get("cf-ipcountry")}})))'
    );

    await supertest(app)
      .get("/some-route")
      .expect(200, "hello")
      .expect("return-country", "DEV");
  });
});
