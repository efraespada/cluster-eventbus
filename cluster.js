const numCPUs = require('os').cpus().length;
const cluster = require('cluster');
const EventBus = require('./index');

let eventBus = new EventBus();
eventBus.withCluster(cluster);

if (cluster.isMaster) {
  let workers = [];

  let spawn = function (i) {

    eventBus.futureWorker(new EventBus.Worker({
      id: `worker_${i}`
    }), (err) => {

      if (err !== undefined) {
        console.error(err);
        return;
      }

      /**
       * Wake up worker process
       * @type {Worker}
       */
      workers[i] = cluster.fork();
      workers[i].on('exit', function (code, signal) {
        logger.debug('respawning worker ' + i);
        spawn(i);
      });
    });

    eventBus.futureWorker(new EventBus.Worker({
      id: `test`
    }), (err) => {
      // nothing to do here
    });

  };

  for (let i = 0; i < numCPUs; i++) {
    spawn(i + 1);
  }
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
