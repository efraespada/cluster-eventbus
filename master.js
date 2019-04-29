const RequestBuilder = require(`./request`);
const bodyParser = require('body-parser');
const timeout = require('connect-timeout');
const Error = {
  "process_net_added_to_eventbus": `Process not added to EventBus`,
  "process_already_added_to_eventbus": `Process already added to EventBus`
};

function Master(configuration) {

  let requestBuilder = new RequestBuilder();
  this.processCounter = 0;
  this.configuration = configuration;
  this.mainPort = this.configuration.port;
  this.runningProcess = {};

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
   * Adds a new process to the process list
   * @param process
   * @param callback
   */
  this.defineRunningProcess = (process, callback) => {
    if (process === null || process === undefined || process.id === undefined) {
      if (this.debug) {
        console.error(`Process not added to EventBus`)
      }
      callback(Error.process_net_added_to_eventbus);
      return;
    }
    if (this.runningProcess[process.id] === undefined) {
      this.runningProcess[process.id] = process;
      this.processCounter++;
      this.runningProcess[process.id].port = this.mainPort + this.processCounter;
      if (this.debug) {
        console.log(`${this.runningProcess[process.id].id} with port ${this.runningProcess[process.id].port}`);
      }
      callback();
    } else {
      if (this.debug) {
        console.warn(`Process ${process.id} already added`)
      }
      callback(Error.process_already_added_to_eventbus);
    }
  };

  this.event = (worker_id, params, callback) => {
    let workerKeys = Object.keys(this.runningProcess);
    let port = -1;
    for (let k in workerKeys) {
      let key = workerKeys[k];
      if (key === worker_id) {
        port = this.runningProcess[key].port;
        break;
      }
    }
    if (port < 0) {
      callback(`port_not_found`)
    } else {
      requestBuilder.getRequest(`http://localhost:${port}/`, params).then((response) => {
        callback(response);
      }).catch((err) => {
        console.log(`error ${err}`);
      });
    }
  };

  this.eventAll = (params, callback) => {
    let workerKeys = Object.keys(this.runningProcess);
    let port = -1;
    for (let k in workerKeys) {
      let key = workerKeys[k];
      if (key === worker_id) {
        port = this.runningProcess[key].port;
        break;
      }
    }
    if (port < 0) {
      callback(`port_not_found`)
    } else {
      requestBuilder.getRequest(`http://localhost:${port}/`, params).then((response) => {
        callback(response);
      }).catch((err) => {
        console.log(`error ${err}`);
      });
    }
  };

}

module.exports = Master;
