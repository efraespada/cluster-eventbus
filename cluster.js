const numCPUs = require('os').cpus().length;
const cluster = require('cluster');
const EventBus = require('./index');
JSON.stringifyAligned = require('json-align');

let eventBus = new EventBus({
    "port": 1000,
    "debug": true
});

if (cluster.isMaster) {
    eventBus.withCluster(`MacBook Pro (914)`, cluster);
    for (let i = 1; i < numCPUs + 1; i++) {
        cluster.fork();
    }
} else {
    eventBus.prepareWorker(cluster, (params) => {
            return {
                "message": `hello ${params.id}, I'm worker_${cluster.worker.id}`,
                "params_received": params
            };
        }
    );
}
