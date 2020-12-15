// Caches API stubs: see https://developers.cloudflare.com/workers/runtime-apis/cache
// (required for Workers Sites to work)
const caches = {
  default: {
    put(request, response) {
      // undefined indicates the response for the request was "successfully" cached
      return Promise.resolve(undefined);
    },
    match(request, options) {
      // undefined indicates that a cached response for the request couldn't be found
      return Promise.resolve(undefined);
    },
    delete(request, options) {
      // false indicates that a cached response for the request couldn't be found to delete
      return Promise.resolve(false);
    }
  }
};

module.exports = { caches };