# cloudflare-worker-local
WIP: Run a Cloudflare Worker Locally

## Running

```shell
$ npm install -g cloudflare-worker-local
$ cloudflare-worker-local /path/to/worker.js localhost:3000 4000

Listening on Port 4000 and forwarding requests to http://localhost:3000/
```

## Automatically reloading

It is possible to use nodemon to automatically reload the worker

```shell
$ npm install -g nodemon
$ nodemon --watch /path/to/worker.js --signal SIGHUP --exec 'cloudflare-worker-local /path/to/worker.js localhost:3000 4000'
```

## Things that are supported (and in scope)

* Anything in Node.js scope by default (Object, Array)
* Anything provided by fetch (fetch, Request, Response, Headers)
* WHATWG URL
* console
* btoa / atob
* crypto.subtle
* Cloudflare key value store if you pass in the KV_NAMESPACE environment variable
* ... this list should probably have more things

## Contributors

* Tejas Dinkar (@gja)
* Jeremy Danyow (@jdanyow)

## Future enhancements

* Support WASM
* Support CPU timeouts
* Better Examples

## Environment Variables

* NUM_WORKERS - Specifies the number of node workers (default 1, to get KV Working in memory)
* KV_NAMESPACES - A comma separated list of keyspaces. (ex: MY_STORE,ANOTHER_STORE)
