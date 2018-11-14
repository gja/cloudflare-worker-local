const { createContext, Script } = require("vm");
const { Request, Response, Headers } = require("node-fetch");
const { URL } = require("url");
const fetch = require("node-fetch");

class Worker {
  constructor(workerContents, { srcHost, dstHost } = {}) {
    this.listeners = {
      fetch: e => e.respondWith(this.fetchUpstream(e.request))
    };
    this.srcHost = srcHost;
    this.dstHost = dstHost;

    this.evaluateWorkerContents(workerContents);
  }

  evaluateWorkerContents(workerContents) {
    const context = { Request, Response, Headers, URL };
    const script = new Script(workerContents);
    script.runInContext(
      createContext(
        Object.assign(context, {
          fetch: this.fetchUpstream.bind(this),
          addEventListener: this.addEventListener.bind(this),
          triggerEvent: this.triggerEvent.bind(this)
        })
      )
    );
  }

  fetchUpstream(request) {
    const url = new URL(request.url);
    if (url.host === this.srcHost) {
      request = new Request(request.url.replace(this.srcHost, this.dstHost));
      request.headers.set("Host", this.srcHost);
    }
    return fetch(request);
  }

  executeFetchEvent(url, opts) {
    let response = null;
    this.triggerEvent("fetch", {
      type: "fetch",
      request: new Request(url, { redirect: "manual", ...opts }),
      respondWith: r => (response = r)
    });
    return Promise.resolve(response);
  }

  addEventListener(event, listener) {
    this.listeners[event] = listener;
  }

  triggerEvent(event) {
    return this.listeners[event].apply(this, Array.from(arguments).slice(1));
  }
}

module.exports = { Worker };
