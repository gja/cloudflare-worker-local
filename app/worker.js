const { createContext, Script } = require("vm");
const { Request, Response, Headers } = require("node-fetch");
const { URL } = require("url");
const fetch = require("node-fetch");
const atob = require("atob");
const btoa = require("btoa");
const crypto = new (require("node-webcrypto-ossl"))();
const { TextDecoder, TextEncoder } = require("util");

function chomp(str) {
  return str.substr(0, str.length - 1);
}

function buildRequest(url, opts) {
  const { country = "DEV", ip = "127.0.0.1", ray = "0000000000000000", ...requestOpts } = opts;
  const request = new Request(url, { redirect: "manual", ...requestOpts });
  const headers = request.headers;
  const parsedURL = new URL(request.url);

  // CF Specific Headers
  headers.set("CF-Ray", ray);
  headers.set("CF-Visitor", JSON.stringify({ scheme: chomp(parsedURL.protocol) }));
  headers.set("CF-IPCountry", country);
  headers.set("CF-Connecting-IP", ip);
  headers.set("X-Real-IP", ip);

  // General Proxy Headers
  headers.append("X-Forwarded-For", ip);
  headers.append("X-Forwarded-Proto", chomp(parsedURL.protocol));

  return new Request(request, { headers });
}

class FetchEvent {
  constructor(request) {
    this.responsePromise = null;
    this.waitEvents = [];
    this.type = "fetch";
    this.request = request;
  }

  waitUntil(e) {
    this.waitEvents.push(e);
  }

  respondWith(e) {
    this.responsePromise = e;
  }

  passThroughOnException(e) {
    // do nothing
  }

  async __response() {
    const [response, ...others] = await Promise.all([this.responsePromise].concat(this.waitEvents));
    return response;
  }
}

class Worker {
  constructor(origin, workerContents, opts = {}) {
    const { upstreamHost, kvStores = {} } = opts;
    this.listeners = {
      fetch: e => e.respondWith(this.fetchUpstream(e.request))
    };
    this.upstreamHost = upstreamHost;
    this.origin = origin;

    this.evaluateWorkerContents(workerContents, kvStores);
  }

  evaluateWorkerContents(workerContents, kvStores) {
    const context = {
      // From fetch
      Request,
      Response,
      Headers,

      // URL Standards
      URL,
      URLSearchParams,

      // bas64
      atob,
      btoa,

      // Crypto
      crypto,
      TextDecoder,
      TextEncoder,

      // Debugging
      console,

      // Async
      setTimeout,
      setInterval,
      clearTimeout,
      clearInterval,

    };
    const script = new Script(workerContents);
    script.runInContext(
      createContext(
        Object.assign(context, kvStores, {
          fetch: this.fetchUpstream.bind(this),
          addEventListener: this.addEventListener.bind(this),
          triggerEvent: this.triggerEvent.bind(this),
          self: context
        })
      )
    );
  }

  fetchUpstream(urlOrRequest, init) {
    let request = urlOrRequest instanceof Request ? urlOrRequest : new Request(urlOrRequest, init);

    const url = new URL(request.url);
    const originalHost = url.host;

    if (originalHost === this.origin) {
      url.host = this.upstreamHost;
      request = new Request(url, request);
      request.headers.set("Host", originalHost);
    }

    return fetch(request);
  }

  async executeFetchEvent(url, opts = {}) {
    const fetchEvent = new FetchEvent(buildRequest(url, opts));
    this.triggerEvent("fetch", fetchEvent);
    return fetchEvent.__response();
  }

  addEventListener(event, listener) {
    this.listeners[event] = listener;
  }

  triggerEvent(event) {
    return this.listeners[event].apply(this, Array.from(arguments).slice(1));
  }
}

module.exports = { Worker };
