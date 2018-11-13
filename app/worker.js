const {createContext, Script} = require('vm')
const { Request, Response, Headers } = require("node-fetch");

class FetchEvent {
  constructor(request) {
    this.type = 'fetch';
    this.request = request;
  }

  respondWith(response) {
    this.response = Promise.resolve(response);
  }
}

class Worker {
  constructor(workerContents, {forwardHost, fetch} = {}) {
    this.listeners = {};
    this.forwardHost = forwardHost;
    this.fetchLib = fetch;

    this.evaluateWorkerContents(workerContents);
  }

  evaluateWorkerContents(workerContents) {
    const context = { Request, Response, Headers };
    const script = new Script(workerContents);
    script.runInContext(createContext(Object.assign(context, {
      fetch: this.internalFetch.bind(this),
      addEventListener: this.addEventListener.bind(this),
      triggerEvent: this.triggerEvent.bind(this)
    })))
  }

  async internalFetch() {

  }

  async executeFetchEvent(...args) {
    const event = new FetchEvent(new Request(...args));
    this.triggerEvent("fetch", event);
    return await event.response;
  }

  addEventListener(event, listener) {
    this.listeners[event] = listener;
  }

  triggerEvent(event) {
    return this.listeners[event].apply(this, Array.from(arguments).slice(1))
  }
}

module.exports = { Worker }
