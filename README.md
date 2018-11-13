# cloudflare-worker-local
WIP: Run a Cloudflare Worker Locally

## Running

```shell
$ npm install
$ node server.js /path/to/worker.js host.to.forward.request.to:3000 4000

Listening on Port 3000 and forwarding requests to http://host.to.forward.request.to/
```
