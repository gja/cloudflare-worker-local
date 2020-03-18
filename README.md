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
* Cloudflare Environment Variables and Secrets loaded from a wrangler.toml
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

## CloudFlare Environment Variables and Secrets

Support for CloudFlare Environment Variables and Secrets is provided via a wrangler.toml file.
See the [wrangler documentation](https://developers.cloudflare.com/workers/tooling/wrangler/configuration)
for more information on the file schema.

To load the wrangler.toml, specify it on the command line:
```shell
$ cloudflare-worker-local /path/to/worker.js localhost:3000 4000 /path/to/wrangler.toml
```

Optionally, the desired environment specified within the wrangler.toml can be loaded:
```shell
$ cloudflare-worker-local /path/to/worker.js localhost:3000 4000 /path/to/wrangler.toml production
```

Secrets are specified under the 'secrets' root key in the document. See the [wrangler.toml](./examples/wrangler.toml) 
for an example of the supported structures.

Two features are provided while loading the wrangler.toml:
* All vars and secrets strings can contain ${} placeholders.
  A placeholder path is resolved using lodash.get and has the context of the root of the config document.
  A placeholder can not refer to a value defined later in the document that also has placeholders.
* Any var or secret that is not a string will be automatically JSON encoded. 
  This allows you to inject complex data into a script by JSON decoding the variable value.

Additionally, any 'kv-namespaces' in the wrangler.toml will be appended to the list of namespaces
provided by KV_NAMESPACES.
