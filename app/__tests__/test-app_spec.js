const { createTestApp } = require("../test-app");
const express = require("express");
const supertest = require("supertest");

describe("server", () => {
  it("returns the response from the worker", async () => {
    const upstreamApp = express();
    upstreamApp.get("/some-route", (req, res) => res.end("hello"));
    const app = createTestApp('addEventListener("fetch", (e) => e.respondWith(fetch(e.request)))', upstreamApp);

    await supertest(app)
      .get("/some-route")
      .expect(200, "hello");
  });
});
