# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [1.14.0](https://github.com/gja/cloudflare-worker-local/compare/v1.13.0...v1.14.0) (2022-02-04)


### Features

* Set CF-IPCountry header from env var, close [#80](https://github.com/gja/cloudflare-worker-local/issues/80) ([#81](https://github.com/gja/cloudflare-worker-local/issues/81)) ([4b8b0e1](https://github.com/gja/cloudflare-worker-local/commit/4b8b0e1e758b5b840d8fea9724b5ae3624d40e81))


### Bug Fixes

* **kv:** handle binary files ([#76](https://github.com/gja/cloudflare-worker-local/issues/76)) ([8a03a79](https://github.com/gja/cloudflare-worker-local/commit/8a03a798098b057b49755d7265940d98fbb06423))
* pipeline fix - Stream.pipeline is available only in nodejs 10 ([#82](https://github.com/gja/cloudflare-worker-local/issues/82)) ([3146f22](https://github.com/gja/cloudflare-worker-local/commit/3146f225d8f257ea034215bd348a6360037fe31b))

<a name="1.13.0"></a>
# [1.13.0](https://github.com/gja/cloudflare-worker-local/compare/v1.12.1...v1.13.0) (2020-12-15)


### Features

* Remaining KV Functions, File-System KV Store, Cache API Stubs, Workers Sites Support ([#57](https://github.com/gja/cloudflare-worker-local/issues/57)) ([78348e4](https://github.com/gja/cloudflare-worker-local/commit/78348e4))



<a name="1.12.1"></a>
## [1.12.1](https://github.com/gja/cloudflare-worker-local/compare/v1.12.0...v1.12.1) (2020-03-26)


### Bug Fixes

* replace missing fs require ([#50](https://github.com/gja/cloudflare-worker-local/issues/50)) ([7ac3ca7](https://github.com/gja/cloudflare-worker-local/commit/7ac3ca7))



<a name="1.12.0"></a>
# [1.12.0](https://github.com/gja/cloudflare-worker-local/compare/v1.11.0...v1.12.0) (2020-03-25)


### Features

* Add Cloudflare Environment Variable and Secret support ([#41](https://github.com/gja/cloudflare-worker-local/issues/41)) ([2091bb5](https://github.com/gja/cloudflare-worker-local/commit/2091bb5))



<a name="1.11.0"></a>
# [1.11.0](https://github.com/gja/cloudflare-worker-local/compare/v1.10.0...v1.11.0) (2019-08-01)


### Features

* add FetchEvent.passThroughOnException() ([#37](https://github.com/gja/cloudflare-worker-local/issues/37)) ([3e21659](https://github.com/gja/cloudflare-worker-local/commit/3e21659))
* Set cf values to request headers for local debugging ([#35](https://github.com/gja/cloudflare-worker-local/issues/35)) ([8d78e0a](https://github.com/gja/cloudflare-worker-local/commit/8d78e0a))



<a name="1.10.0"></a>
# [1.10.0](https://github.com/gja/cloudflare-worker-local/compare/v1.9.0...v1.10.0) (2019-04-15)


### Bug Fixes

* **Example:** Apparently response headers are immutable. Closes [[#27](https://github.com/gja/cloudflare-worker-local/issues/27)] ([#28](https://github.com/gja/cloudflare-worker-local/issues/28)) ([31cb10b](https://github.com/gja/cloudflare-worker-local/commit/31cb10b))


### Features

* **Worker:** Supporting callback functions like setTimeout, setInterval ([#30](https://github.com/gja/cloudflare-worker-local/issues/30)) ([0abbaec](https://github.com/gja/cloudflare-worker-local/commit/0abbaec)), closes [#29](https://github.com/gja/cloudflare-worker-local/issues/29)
* Reduce post limit, fixes [#31](https://github.com/gja/cloudflare-worker-local/issues/31) ([#32](https://github.com/gja/cloudflare-worker-local/issues/32)) ([000c435](https://github.com/gja/cloudflare-worker-local/commit/000c435))



<a name="1.9.0"></a>
# [1.9.0](https://github.com/gja/cloudflare-worker-local/compare/v1.8.1...v1.9.0) (2019-01-04)


### Features

* **Worker:** waitUntil and respondWith must be bound to e in order to work ([06bc243](https://github.com/gja/cloudflare-worker-local/commit/06bc243))



<a name="1.8.1"></a>
## [1.8.1](https://github.com/gja/cloudflare-worker-local/compare/v1.8.0...v1.8.1) (2019-01-04)


### Bug Fixes

* Exposing the stores via test app ([fd468e1](https://github.com/gja/cloudflare-worker-local/commit/fd468e1))



<a name="1.8.0"></a>
# [1.8.0](https://github.com/gja/cloudflare-worker-local/compare/v1.7.0...v1.8.0) (2019-01-02)


### Features

* **KVStore:** Expose the KV Store from create app ([#24](https://github.com/gja/cloudflare-worker-local/issues/24)) ([5844ace](https://github.com/gja/cloudflare-worker-local/commit/5844ace))



<a name="1.7.0"></a>
# [1.7.0](https://github.com/gja/cloudflare-worker-local/compare/v1.6.0...v1.7.0) (2018-12-28)


### Features

* **TestWorkers:** Ability to Unit Test Workers ([#23](https://github.com/gja/cloudflare-worker-local/issues/23)) ([dc33dff](https://github.com/gja/cloudflare-worker-local/commit/dc33dff))



<a name="1.6.0"></a>
# [1.6.0](https://github.com/gja/cloudflare-worker-local/compare/v1.5.0...v1.6.0) (2018-12-18)


### Features

* **Worker:** Supporting most CF Headers ([#22](https://github.com/gja/cloudflare-worker-local/issues/22)) ([99e5db7](https://github.com/gja/cloudflare-worker-local/commit/99e5db7)), closes [#21](https://github.com/gja/cloudflare-worker-local/issues/21)
* **InMemoryKVStore:** Delete Items from InMemoryKVStore ([#20](https://github.com/gja/cloudflare-worker-local/pull/20))


<a name="1.5.0"></a>
# [1.5.0](https://github.com/gja/cloudflare-worker-local/compare/v1.4.0...v1.5.0) (2018-12-06)


### Features

* Adding an index.js which only exports safe symbols ([#19](https://github.com/gja/cloudflare-worker-local/issues/19)) ([6e5323d](https://github.com/gja/cloudflare-worker-local/commit/6e5323d))



<a name="1.4.0"></a>
# [1.4.0](https://github.com/gja/cloudflare-worker-local/compare/v1.3.0...v1.4.0) (2018-12-03)


### Features

* update main in package ([#13](https://github.com/gja/cloudflare-worker-local/issues/13)) ([8c82a79](https://github.com/gja/cloudflare-worker-local/commit/8c82a79))
* **Worker:** add self to scope ([996cec5](https://github.com/gja/cloudflare-worker-local/commit/996cec5))
* **Worker:** add URLSearchParams ([#16](https://github.com/gja/cloudflare-worker-local/issues/16)) ([af6f1be](https://github.com/gja/cloudflare-worker-local/commit/af6f1be))



<a name="1.3.0"></a>
# [1.3.0](https://github.com/gja/cloudflare-worker-local/compare/v1.2.0...v1.3.0) (2018-11-29)


### Features

* **build:** Added standard-version ([#12](https://github.com/gja/cloudflare-worker-local/issues/12)) ([9507984](https://github.com/gja/cloudflare-worker-local/commit/9507984))
* **build:** Adding prlint ([168e4cb](https://github.com/gja/cloudflare-worker-local/commit/168e4cb))



<a name="1.2.0"></a>
## [1.2.0](https://github.com/gja/cloudflare-worker-local/compare/v1.1.0...v1.2.0) (2018-11-29)


### Features

* Simple In Memory KV Store by [@gja](https://github.com/gja)
* Base64 support by [@jdanyow](https://github.com/jdanyow)
* Subtle Crypto support by [@jdanyow](https://github.com/jdanyow)
* Readme Updates for hot reloading
