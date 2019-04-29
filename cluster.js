const numCPUs = require('os').cpus().length;
const cluster = require('cluster');
const EventBus = require('./index');

let eventBus = new EventBus({
  "port": 1000,
  "debug": false
});

if (cluster.isMaster) {
  eventBus.withCluster(cluster);

  for (let i = 1; i < numCPUs + 1; i++) {
    eventBus.futureWorker(new EventBus.Worker({
      id: `worker_${i}`
    }), (err) => {

      if (err !== undefined) {
        console.error(err);
        return;
      }

      cluster.fork();
    });
  }
  eventBus.futureWorker(new EventBus.Worker({
    id: `test`
  }), (err) => {
    // nothing to do here
  });
} else {
  eventBus.prepareWorker(new EventBus.Worker({
      id: `worker_${cluster.worker.id}`
    }), (params) => {
      return {
        "message": `hello ${params.id}, I'm worker_${cluster.worker.id}`,
        "params_received": params
      };
    }
  );
}
