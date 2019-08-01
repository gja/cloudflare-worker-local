# cloudflare-worker-local
Run (or test) a Cloudflare Worker Locally. If you are looking for a project that will quickly help you bootstrap your worker, take a look at [create-cloudflare-worker](https://github.com/gja/create-cloudflare-worker)

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

## Unit Testing a Cloudflare Worker

`cloudflare-worker-local` can be used to unit test a cloudflare worker. Please see [This Example](examples/unit-test-a-worker). You may also be interested in [create-cloudflare-worker](https://github.com/gja/create-cloudflare-worker)

## Things that are supported (and in scope)

* Anything in Node.js scope by default (Object, Array)
* Anything provided by fetch (fetch, Request, Response, Headers)
* WHATWG URL
* console
* btoa / atob
* crypto.subtle
* Cloudflare key value store if you pass in the KV_NAMESPACE environment variable
* Cloudflare [event.passThroughOnException()](https://workers.cloudflare.com/docs/reference/workers-concepts/fetch-event-lifecycle/#passthroughonexception) for runtime exception handling
* ... this list should probably have more things

## Contributors

* Tejas Dinkar (@gja)
* Jeremy Danyow (@jdanyow)
* Rita Liu (@rita-liu)

## Future enhancements

* Support WASM
* Support CPU timeouts
* Better Examples

## Environment Variables

* NUM_WORKERS - Specifies the number of node workers (default 1, to get KV Working in memory)
* KV_NAMESPACES - A comma separated list of keyspaces. (ex: MY_STORE,ANOTHER_STORE)
