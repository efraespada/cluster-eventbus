# Cluster EventBus
[![npm version][npm-badge]][npm]
[![Build Status][travis-badge]][travis]
[![Dependency Status][david-badge]][david]
[![DevDependency Status][david-badge-dev]][david-dev]

Simple library for communicating different processes. 

I developed the library for communicating different cluster processes. It also connects different machines in the same local network to share clusters and distribute the work.
```bash
$ npm install cluster-eventbus --save
```

<p align="center"><img width="60%" vspace="20" src="https://github.com/efraespada/cluster-eventbus/raw/develop/eventbus.png"></p>

Sample working on a Node cluster:

```js
const numCPUs = require('os').cpus().length;
const cluster = require('cluster');
const EventBus = require('cluster-eventbus');

let eventBus = new EventBus({
    core: `MacBook Pro (914)`,
    debug: true
}).cluster(cluster);

if (cluster.isMaster) {
    for (let i = 1; i < numCPUs + 1; i++) {
        cluster.fork();
    }
} else {
    eventBus.prepareWorker(cluster, (params) => {
        
            // do something with params
            // and return something
        
            return {
                "message": `hello ${params.id}, I'm worker_${cluster.worker.id}`,
                "params_received": params
            };
        }
    );
}
```
### Ask
Ask something to a worker:
```js
let response = await eventBus.event(`MacBook Pro (914)`,`worker_1`, {
  "message": `hello worker 1`,
  "id": `test_worker`
})
```
Response model:
```json
{
    "response": {},
    "error": true,
    "error_message": ""
}
```
### Ask To All
Ask the same to all workers:
```js
let response = await eventBus.eventAll({
  "message": `hello workers`,
  "id": `test_worker`,
  "data": {
      "method": "get_name"
  }
})
```
Response model:
```json
{
    "responses": [{}, {}],
    "error": true,
    "error_messages": ["", ""]
}
```

### Close Process
Close everything by calling:
```bash
await eventBus.closeAll();
```

### Machine Name
```js
EventBus.MACHINE_NAME
```
Response:
```
MacBook Pro (914)
```

[david]: https://david-dm.org/efraespada/cluster-eventbus
[david-badge]: https://david-dm.org/efraespada/cluster-eventbus.svg
[travis]: https://travis-ci.org/efraespada/cluster-eventbus
[travis-badge]: https://travis-ci.org/efraespada/cluster-eventbus.svg?branch=master
[david-dev]: https://david-dm.org/efraespada/cluster-eventbus?type=dev
[david-badge-dev]: https://david-dm.org/efraespada/cluster-eventbus/dev-status.svg
[npm]: https://www.npmjs.com/package/cluster-eventbus
[npm-badge]: https://badge.fury.io/js/cluster-eventbus.svg
