const { createContext, Script } = require("vm");
const { Request, Response, Headers } = require("node-fetch");
const { URL } = require("url");
const fetch = require("node-fetch");

class Worker {
  constructor(workerContents, { forwardHost } = {}) {
    this.listeners = {
      fetch: e => e.respondWith(this.fetchUpstream(e.request))
    };
    this.forwardHost = forwardHost;

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

  async fetchUpstream(request) {
    const response = await fetch(request);
    return response;
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
