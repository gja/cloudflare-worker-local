# cloudflare-worker-local
WIP: Run a Cloudflare Worker Locally

## Running

```shell
$ npm install
$ node server.js /path/to/worker.js host.to.forward.request.to:3000 4000

Listening on Port 4000 and forwarding requests to http://host.to.forward.request.to:3000/
```
## Things that are supported (and in scope)

* Anything in Node.js scope by default (Object, Array)
* Anything provided by fetch (fetch, Request, Response, Headers)
* WHATWG URL
* ... this list should probably have more things

## Future enhancements

* Do an in-memory story for Cloudflare Key-Value
* Support WASM
* Support CPU timeouts
