const { createApp } = require("../server");
const supertest = require("supertest");

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
});
