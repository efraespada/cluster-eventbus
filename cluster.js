const numCPUs = require('os').cpus().length;
const cluster = require('cluster');
const EventBus = require('./index');

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
