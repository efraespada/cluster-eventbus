# Cluster EventBus
Simple library for communicate different Node processes. Works with clusters.

```bash
$ npm install cluster-eventbus --save
```
Sample working on a Node cluster:

```js
const numCPUs = require('os').cpus().length;
const cluster = require('cluster');
const EventBus = require('cluster-eventbus');

// setup EventBus
let eventBus = new EventBus();
eventBus.withCluster(cluster);

if (cluster.isMaster) {
    for (let i = 1; i < numCPUs + 1; i++) {
         cluster.fork();
    }
} else {
    // prepare the event-bus worker for incoming events
    eventBus.prepareWorker(new EventBus.Worker({
        id: `worker_${cluster.worker.id}`
    }), (params) => {
      
        // do something with params
        // and return whatever as {}
        console.log(`${params.message}`)
      
        return {
            "message": `hello ${params.id}, I'm worker_${cluster.worker.id}`,
            "params_received": params
        };
    });
}
```
Ask something to a worker:
```js
// asking to worker 1
eventBus.event(`worker_1`, {
  "message": `hello worker 1`,
  "id": `worker_2`
}, (response) => {
  console.log(`response from worker_1: ${JSON.stringify(response)}`);
})
```