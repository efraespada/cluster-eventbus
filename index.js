const computerName = require('computer-name');
const Worker = require('./worker');
const Master = require('./master');
const EventUtils = require('./event_utils');
const fs = require('fs');
const ip = require('ip');
JSON.stringifyAligned = require('json-align');


function EventBus(configuration) {

  let utils = new EventUtils();
  this.configuration = configuration || {};
  if (this.configuration.port === undefined) {
    this.configuration.port = 1000;
  }
  this.debug = this.configuration.debug || false;
  this.master = null;
  this.machineName = computerName();
  this.currentWorker = null;

  this.defineMaster = () => {
    this.master = new Master(this.configuration);
    this.prepareConfigMaster();

    console.log(process.cwd());
    console.log(ip.address());
    this.master.prepare(computerName(), (port) => {
      /**
       * Main EventBus process started
       */
      if (this.debug) {
        console.log(`eventbus master started (${port})`)
      }
    }, (req, res) => {
      /**
       * Process request
       */
      if (req.body !== undefined && req.body.method !== undefined) {
        let body = req.body;
        if (body.method === "event_to" && body.worker_id !== undefined && body.params !== undefined) {
          this.event(body.worker_id, body.params, (response) => {
            let r = response || {};
            res.json(r);
          })
        } else {
          res.send(`body_not_found`)
        }
      } else if (req.query !== undefined && req.query.method !== undefined) {
        let query = req.query;
        if (query.method === "get_port" && query.worker_id !== undefined) {
          let workerKeys = Object.keys(this.master.runningProcess);
          let port = -1;
          for (let k in workerKeys) {
            let key = workerKeys[k];
            if (key === query.worker_id) {
              port = this.master.runningProcess[key].port;
              break;
            }
          }
          if (port < 0) {
            res.send(`port_not_found`)
          } else {
            res.json({
              worker_id: query.worker_id,
              port: port
            });
          }
        }
      } else {
        res.send(`body_not_found`)
      }
    });
  };

  this.futureWorker = (worker, callback) => {
    if (this.master !== null) {
      let port = this.getPortForWorker(this.machineName, worker.id, this.configuration.port);
      utils.prepareConfigWorker(this.machineName, worker.id, ip.address(), port);
      worker.ip = ip.address();
      worker.port = port;
      this.master.defineRunningProcess(process, callback);
    }
  };

  /**
   * Retrieves the needed port for the given worker
   * and launch it
   * @param worker
   * @param callback
   */
  this.prepareWorker = (worker, callback) => {
    this.currentWorker = worker;
    this.currentWorker.configuration.mainPort = this.configuration.port;
    this.currentWorker.prepare((port) => {
      if (this.debug) {
        console.log(`eventbus ${this.currentWorker.id} started (${port})`)
      }
    }, async (req, res) => {
      let body = null;
      if (req.body !== undefined && Object.keys(req.body).length > 0) {
        body = req.body;
      } else if (req.query !== undefined && Object.keys(req.query).length > 0) {
        body = req.query;
      } else {
        res.send(`body_not_found`);
        return;
      }
      let response = await callback(body);
      res.json(response);
    })
  };

  this.event = (worker_id, params, callback) => {
    if (this.currentWorker !== null) {
      if (worker_id === this.currentWorker.id) {
        return;
      }
      this.currentWorker.event(worker_id, params, callback)
    } else {
      this.master.event(worker_id, params, callback);
    }
  };

  this.withCluster = (cluster) => {
    if (cluster.isMaster) {
      this.defineMaster();
    }
  };

  this.multiComputerProcessing = () => {
    console.log(`preparing multiCoreProcessing`)
  };

  this.prepareConfigMaster = () => {
    let configPath = `${process.cwd()}/config.json`;
    let machineName = computerName();
    if (!fs.existsSync(configPath)) {
      let json = {};
      json[`${machineName}`] = require(`./config_files/default_config_machine`);
      fs.writeFileSync(configPath, JSON.stringifyAligned(json), 'utf8');
    }
    let conf = require(configPath);
    if (conf[machineName] !== undefined) {
      conf[machineName].isCore = true;
      conf[machineName].master.ip = ip.address();
      fs.writeFileSync(configPath, JSON.stringifyAligned(conf), 'utf8');
    }
    console.log(`config :
${JSON.stringifyAligned(conf)}`)
  };

  this.prepareConfigWorker = (worker_id, ip, port) => {
    let configPath = `${process.cwd()}/config.json`;
    let machineName = computerName();
    if (!fs.existsSync(configPath)) {
      let json = {};
      json[`${machineName}`] = require(`./config_files/default_config_machine`);
      delete json[`${machineName}`].master;
      fs.writeFileSync(configPath, JSON.stringifyAligned(json), 'utf8');
    }
    let conf = require(configPath);
    if (conf[machineName] !== undefined) {
      if (conf[machineName].workers === undefined) {
        conf[machineName].workers = {};
      }
      if (conf[machineName].workers[worker_id] === undefined) {
        conf[machineName].workers[worker_id] = {};
      }
      conf[machineName].workers[worker_id].id = worker_id;
      conf[machineName].workers[worker_id].ip = ip.address();
      conf[machineName].workers[worker_id].port = utils.getPortForWorker(conf, this.machineName, worker_id, this.configuration.port);
      fs.writeFileSync(configPath, JSON.stringifyAligned(conf), 'utf8');
    }
    return conf;
  };


}


exports = module.exports = EventBus;
exports.Master = Master;
exports.Worker = Worker;

