const {createContext, Script} = require('vm')

class Worker {
  constructor(workerContents, {forwardHost, fetch} = {}) {
    this.self = this;
    this.fetch = this.fetch.bind(this);
    this.addEventListener = this.addEventListener.bind(this);
    this.triggerEvent = this.triggerEvent.bind(this);

    this.__listeners = {};

    const script = new Script(workerContents);
    script.runInContext(createContext(this))

    this.forwardHost = forwardHost;
    this.fetchLib = fetch;
  }

  async fetch() {

  }

  addEventListener(event, listener) {
    this.__listeners[event] = listener;
  }

  triggerEvent(event) {
    return this.__listeners[event].apply(this, Array.from(arguments).slice(1))
  }
}

module.exports = { Worker }
