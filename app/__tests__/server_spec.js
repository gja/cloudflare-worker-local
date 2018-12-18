const { createApp } = require("../server");
const supertest = require("supertest");

describe("server", () => {
  it("returns the response from the worker", done => {
    const app = createApp(
      'addEventListener("fetch", (e) => e.respondWith(new Response("hello", {status: 201, headers: {"Some-Header": "value"}})))'
    );

    supertest(app)
      .get("/some-route")
      .expect(201, "hello")
      .expect("Some-Header", "value")
      .then(() => done());
  });

  it("passes url related field to the header", done => {
    const app = createApp(
      'addEventListener("fetch", (e) => e.respondWith(new Response(`${e.request.url}|${e.request.headers.get("Foo")}`)))'
    );

    supertest(app)
      .get("/some-route")
      .set("Foo", "bar")
      .expect(200, function() {
        expect(this.response.text).toBe(`${this.url}|bar`);
        done();
      });
  });

  it("passes post information on", done => {
    const app = createApp(
      'addEventListener("fetch", (e) => e.respondWith(e.request.text().then(text => new Response(`${e.request.method}|${text}`))))'
    );

    supertest(app)
      .post("/some-route")
      .send("foo=bar")
      .expect(200, function() {
        expect(this.response.text).toBe(`POST|foo=bar`);
        done();
      });
  });

  it("allows you to update the worker", done => {
    const app = createApp('addEventListener("fetch", (e) => e.respondWith(new Response("goodbye")))');

    supertest(app)
      .get("/some-route")
      .expect(200, "goodbye")
      .then(() => done());
  });

  it("passes the current ip onwards", done => {
    const app = createApp(
      'addEventListener("fetch", (e) => e.respondWith(new Response(e.request.headers.get("X-Forwarded-For"))))'
    );
    supertest(app)
      .get("/some-route")
      .expect(200, "127.0.0.1")
      .then(() => done());
  });
});
