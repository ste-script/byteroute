## [1.5.0](https://github.com/ste-script/byteroute/compare/v1.4.2...v1.5.0) (2026-02-11)

### Features

* **backend:** store and provide traffic flow metrics ([27b2aa2](https://github.com/ste-script/byteroute/commit/27b2aa276a08190d952c2d2bfabf509fe90b169f))
* **client-go:** provide traffic flow to the backend ([cf1d508](https://github.com/ste-script/byteroute/commit/cf1d50815692f992dde10aa089e41158bbd4f930))
* connection status ([a52eb03](https://github.com/ste-script/byteroute/commit/a52eb035a96cf11522d484b88cd54e3fd3c85fa0))
* **dashboard:** add connection bandwith in list ([fe4a2f8](https://github.com/ste-script/byteroute/commit/fe4a2f83f62a70af54188cdf3d16a2e786654247))
* **dashboard:** human readable data ([772d1ff](https://github.com/ste-script/byteroute/commit/772d1ffa92acfe412b8bdf9b919403a533c3427f))
* **dashboard:** version ([3307eac](https://github.com/ste-script/byteroute/commit/3307eace692e901c36e9fdbcc9affecf74a6b363))

### Bug Fixes

* **backend:** avoid unnecessary db downloads ([cb9ac40](https://github.com/ste-script/byteroute/commit/cb9ac408ec7b6216f3c58bd2f7522c6c8b5c38ad))
* **dashboard:** connection status ([1d5eca4](https://github.com/ste-script/byteroute/commit/1d5eca4820bda083ae9fc12d759a43410709a3c1))
* **dashboard:** select missing import ([9a3838b](https://github.com/ste-script/byteroute/commit/9a3838b16d0a33f4aac4f0d120dd614eca1da009))
* remove category blocked status ([42e3794](https://github.com/ste-script/byteroute/commit/42e3794ee6bec5aef5aab4b29ebced451b1dff74))

## [1.4.2](https://github.com/ste-script/byteroute/compare/v1.4.1...v1.4.2) (2026-02-07)

### Bug Fixes

* **backend:** rewrite script to not use curl ([830049b](https://github.com/ste-script/byteroute/commit/830049b77600e00b5f266b47f83c8dd78813efbd))

## [1.4.1](https://github.com/ste-script/byteroute/compare/v1.4.0...v1.4.1) (2026-02-07)

### Bug Fixes

* **client-go:** setup docker lease ([be46240](https://github.com/ste-script/byteroute/commit/be4624048661eff123fb58fb9d8fca9cef96d542))

## [1.4.0](https://github.com/ste-script/byteroute/compare/v1.3.0...v1.4.0) (2026-02-03)

### Features

* **client-go:** remove reporterIp ([0f29db6](https://github.com/ste-script/byteroute/commit/0f29db641ce0e4f321fcf61f8d5fd0efe10acc47))
* fire-and-forget enrichment ([7ffdb06](https://github.com/ste-script/byteroute/commit/7ffdb06a0a35d3809ad0308059f3a6ee587cb938))
* specify wan ip address ([95f5374](https://github.com/ste-script/byteroute/commit/95f5374ac3576a44e43760b12fb13eb3f351924b))

### Bug Fixes

* bpf statement ([0c966b0](https://github.com/ste-script/byteroute/commit/0c966b08caa0e0b8cb3e63f9c0494f99b4ee8f0a))

## [1.3.0](https://github.com/ste-script/byteroute/compare/v1.2.1...v1.3.0) (2026-01-30)

### Features

* add socket.io comunication from backend and dashboard ([074b501](https://github.com/ste-script/byteroute/commit/074b5019d5bb01b09f3d92c42e45cabe27960f4e))

### Bug Fixes

* **deps:** update deck-gl monorepo to ^9.2.6 ([#41](https://github.com/ste-script/byteroute/issues/41)) ([ce464fe](https://github.com/ste-script/byteroute/commit/ce464fed9667d22b431af41c59393b9ed0340c93))
* **deps:** update dependency @primevue/themes to ^4.5.4 ([#42](https://github.com/ste-script/byteroute/issues/42)) ([4a59c02](https://github.com/ste-script/byteroute/commit/4a59c02018f75ca17eb8f265ea91eef9359ad701))
* **deps:** update dependency @tanstack/vue-query to ^5.92.8 ([#43](https://github.com/ste-script/byteroute/issues/43)) ([aadb30d](https://github.com/ste-script/byteroute/commit/aadb30d2a7127676eb75941abaa08166cb12ebd1))
* **deps:** update dependency @tanstack/vue-query to ^5.92.9 ([#66](https://github.com/ste-script/byteroute/issues/66)) ([4ea2433](https://github.com/ste-script/byteroute/commit/4ea24330fb47ae1d66835900b99011224a3ade0c))
* **deps:** update dependency echarts to ^5.6.0 ([a2a7cdb](https://github.com/ste-script/byteroute/commit/a2a7cdb64e35784549e2bfd811ef7e5fcc9e5a74))
* **deps:** update dependency echarts to v6 ([#62](https://github.com/ste-script/byteroute/issues/62)) ([8248e5d](https://github.com/ste-script/byteroute/commit/8248e5d9c9a74cc79726debf50fc26082d907dc9))
* **deps:** update dependency mongoose to ^9.1.5 ([#45](https://github.com/ste-script/byteroute/issues/45)) ([5731ce9](https://github.com/ste-script/byteroute/commit/5731ce90016f185a9d26ff50a80494b304eb8c0d))
* **deps:** update dependency pinia to ^2.3.1 ([8771b6f](https://github.com/ste-script/byteroute/commit/8771b6fbff5113519d03c28fe207b03907e90830))
* **deps:** update dependency pinia to v3 ([#64](https://github.com/ste-script/byteroute/issues/64)) ([1cca0ab](https://github.com/ste-script/byteroute/commit/1cca0ab33e6e619f91b2327030e1f3849c781bbe))
* **deps:** update dependency primevue to ^4.5.4 ([#48](https://github.com/ste-script/byteroute/issues/48)) ([8a5cc22](https://github.com/ste-script/byteroute/commit/8a5cc229a264b6fc989ecf0ddfd18f26de5ca000))
* **deps:** update dependency vue to ^3.5.27 ([#49](https://github.com/ste-script/byteroute/issues/49)) ([84aa99e](https://github.com/ste-script/byteroute/commit/84aa99e61fa8f188aa012d600052ba6fa556347f))
* **deps:** update dependency vue-echarts to v8 ([#65](https://github.com/ste-script/byteroute/issues/65)) ([9d0c2d5](https://github.com/ste-script/byteroute/commit/9d0c2d5abc7683dec13333280fe9cda2f2b2eb44))
* **deps:** update dependency vue-router to ^4.6.4 ([#51](https://github.com/ste-script/byteroute/issues/51)) ([a9d874f](https://github.com/ste-script/byteroute/commit/a9d874f124c4aa03cc2e8de5ce34fd1d5dcc0a6c))

## [1.2.1](https://github.com/ste-script/byteroute/compare/v1.2.0...v1.2.1) (2026-01-17)

### Bug Fixes

* **deps:** update dependency express to v5 ([39a1f18](https://github.com/ste-script/byteroute/commit/39a1f18ec05e5f45cb6642674d8ac2e990d2b97c))
* **deps:** update dependency mongoose to ^9.1.4 ([e484498](https://github.com/ste-script/byteroute/commit/e4844984792281df47ee5cd944597bcafb61300d))
* **deps:** update socket.io packages to ^4.8.3 ([d1e7ecc](https://github.com/ste-script/byteroute/commit/d1e7ecc954243f0926f5a67a7c9b247b09f3388d))

## [1.2.0](https://github.com/ste-script/byteroute/compare/v1.1.0...v1.2.0) (2026-01-17)

### Features

* **dashboard:** first dasboard impl ([e824411](https://github.com/ste-script/byteroute/commit/e8244117aa571f9703f4cae65eece8d68b6a68c3))

### Bug Fixes

* **dashboard:** correct linting ([9ddd617](https://github.com/ste-script/byteroute/commit/9ddd617c7b4b9f22137f59b7d09b4b0e00a0ede6))

## [1.1.0](https://github.com/ste-script/byteroute/compare/v1.0.0...v1.1.0) (2026-01-17)

### Features

* add mongo integration to shared package ([04f3993](https://github.com/ste-script/byteroute/commit/04f3993d0a1f3518d16fb5a769a9edf44ca7d512))
* **backend:** connect to mongodb ([74375c3](https://github.com/ste-script/byteroute/commit/74375c37744d75a20dae9ac5cd5251e611b1bed3))
* create seeder apps ([521d230](https://github.com/ste-script/byteroute/commit/521d230c5135a03ec6e97fe71adddb202e1f5bb6))

### Bug Fixes

* move .env files into devcontainer ([ae69311](https://github.com/ste-script/byteroute/commit/ae69311d2f52e6ff2fe23e7c0bb96c90eed45a4c))

## 1.0.0 (2026-01-16)

### Bug Fixes

* **backend:** import for test ([d7f8e37](https://github.com/ste-script/byteroute/commit/d7f8e37ee00dcf5b793e7b9e09388fb5715f5acf))
