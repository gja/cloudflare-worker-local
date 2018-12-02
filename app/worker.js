const { createContext, Script } = require("vm");
const { Request, Response, Headers } = require("node-fetch");
const { URL } = require("url");
const fetch = require("node-fetch");
const atob = require('atob');
const btoa = require('btoa');
const crypto = new (require('node-webcrypto-ossl'))();
const { TextDecoder, TextEncoder } = require('util');

function buildKVStores(kvStoreFactory, kvStores) {
  return kvStores.reduce((acc, name) => {
    acc[name] = kvStoreFactory.getClient(name);
    return acc;
  }, {});
}

class Worker {
  constructor(
    origin,
    workerContents,
    { upstreamHost, kvStores = [], kvStoreFactory = require("./in-memory-kv-store") } = {}
  ) {
    this.listeners = {
      fetch: e => e.respondWith(this.fetchUpstream(e.request))
    };
    this.upstreamHost = upstreamHost;
    this.origin = origin;

    this.evaluateWorkerContents(workerContents, buildKVStores(kvStoreFactory, kvStores));
  }

  evaluateWorkerContents(workerContents, kvStores) {
    const context = { Request, Response, Headers, URL, URLSearchParams, atob, btoa, crypto, TextDecoder, TextEncoder, console };
    const script = new Script(workerContents);
    script.runInContext(
      createContext(
        Object.assign(context, kvStores, {
          fetch: this.fetchUpstream.bind(this),
          addEventListener: this.addEventListener.bind(this),
          triggerEvent: this.triggerEvent.bind(this)
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

  async executeFetchEvent(url, opts) {
    let response = null;
    let waitUntil = [];
    this.triggerEvent("fetch", {
      type: "fetch",
      request: new Request(url, { redirect: "manual", ...opts }),
      respondWith: r => (response = r),
      waitUntil: e => waitUntil.push(e)
    });
    const r = await Promise.resolve(response);
    await Promise.all(waitUntil);
    return r;
  }

  addEventListener(event, listener) {
    this.listeners[event] = listener;
  }

  triggerEvent(event) {
    return this.listeners[event].apply(this, Array.from(arguments).slice(1));
  }
}

module.exports = { Worker };
