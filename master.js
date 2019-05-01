const RequestBuilder = require(`./request`);
const bodyParser = require('body-parser');
const timeout = require('connect-timeout');
const EventUtils = require('./event_utils');
const Error = {
  "process_net_added_to_eventbus": `Process not added to EventBus`,
  "process_already_added_to_eventbus": `Process already added to EventBus`
};

function Master(configuration) {

  let utils = new EventUtils();
  let requestBuilder = new RequestBuilder();
  this.configuration = configuration;
  this.mainPort = this.configuration.port;

  this.prepare = (machine_name, callback, request) => {
    const express = require('express');
    const app = express();
    app.use(bodyParser.urlencoded({extended: true}));
    app.use(bodyParser.json({limit: '50mb'}));
    app.use(timeout('120s'));
    app.use(function(req, res, next) {
      res.header("Access-Control-Allow-Origin", "*");
      res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Access-Control-Allow-Headers, Access-Control-Allow-Origin");
      next();
    });
    app.get('/', (req, res) => request(req, res));
    app.post('/', (req, res) => request(req, res));
    app.listen(this.mainPort, callback(this.mainPort));
  };

  /**
   * Sends a event to a worker
   * @param machine_name
   * @param worker_id
   * @param params
   * @param callback
   */
  this.event = (machine_name, worker_id, params, callback) => {
    let config = utils.getConfig();
    if (config[machine_name] === undefined
        || config[machine_name].workers === undefined
        || config[machine_name].workers[worker_id] === undefined
        || config[machine_name].workers[worker_id].ip === undefined
        || config[machine_name].workers[worker_id].port === undefined) {
      return
    }
    let ip = config[machine_name].workers[worker_id].ip;
    let port = config[machine_name].workers[worker_id].port;
    if (port < 0) {
      callback(`port_not_found`)
    } else {
      requestBuilder.getRequest(`http://${ip}:${port}/`, params).then((response) => {
        callback(response);
      }).catch((err) => {
        console.log(`error ${err}`);
      });
    }
  };

  /**
   * Sends the same event to all workers
   * @param params
   * @param callback
   */
  this.eventAll = (params, callback) => {
    let config = utils.getConfig();
    let machineKeys = Object.keys(config);
    for (let m in machineKeys) {
      let key = machineKeys[m];
      let machine = config[key];
      if (machine.workers !== undefined) {
        let workerKeys = Object.keys(machine.workers);
        for (let wk in workerKeys) {
          let workerKey = workerKeys[wk];
          let worker = machine.workers[workerKey];
          if (worker.ip !== undefined && worker.port !== undefined) {
            requestBuilder.getRequest(`http://${worker.ip}:${worker.port}/`, params).then((response) => {
              callback(worker.id, response);
            }).catch((err) => {
              console.log(`error ${err}`);
            });
          }
        }
      }
    }
  };

}

module.exports = Master;
