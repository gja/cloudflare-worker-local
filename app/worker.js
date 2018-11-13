const {createContext, Script} = require('vm')
const { Request, Response, Headers } = require("node-fetch");

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
      fetch: this.fetch.bind(this),
      addEventListener: this.addEventListener.bind(this),
      triggerEvent: this.triggerEvent.bind(this)
    })))
  }

  async fetch() {

  }

  addEventListener(event, listener) {
    this.listeners[event] = listener;
  }

  triggerEvent(event) {
    return this.listeners[event].apply(this, Array.from(arguments).slice(1))
  }
}

module.exports = { Worker }
