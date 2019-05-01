# Cluster EventBus
Simple library for communicate different Node processes. 

It has been designed for communicating different clustered Node processes. The library also connects different machines to share clusters and distribute the work
```bash
$ npm install cluster-eventbus --save
```

<p align="center"><img width="75%" vspace="20" src="https://github.com/efraespada/cluster-eventbus/raw/develop/eventbus.png"></p>

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
Ask something to a worker:
```js
let response = await eventBus.event(`My_Machine`,`worker_1`, {
  "message": `hello worker 1`,
  "id": `super worker :D`
})

{
    response: {},
    error: true,
    error_message: ``
}
```
Ask the same to all workers:
```js
let response = await eventBus.eventAll({
  "message": `hello workers`,
  "id": `other worker`,
  "dfvafva": 0
})

{
    responses: [{}, {}],
    error: true,
    error_messages: [``, ``]
}
```