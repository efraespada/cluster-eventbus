const RequestBuilder = require(`./request`);
const bodyParser = require('body-parser');
const timeout = require('connect-timeout');

function Worker(configuration, callback) {

  let requestBuilder = new RequestBuilder();

  this.configuration = configuration || {};
  if (this.configuration.id === undefined) {
    throw new Error(`Process ID not defined`);
  }
  this.id = this.configuration.id;
  this.ip = null;
  this.port = null;

  this.pending_request = {

  };

  this.getId = () => {
    return this.id;
  };

  this.prepare = (callback, request) => {
    requestBuilder.getRequest(`http://${this.ip}:${this.configuration.mainPort}/`, {
      "method": "get_port",
      "worker_id": this.id
    }).then((response) => {
      if (response.worker_id !== this.id) {
        console.error(`worker id mismatch ${this.id} - ${response.worker_id}`);
        return
      }
      this.port = response.port;
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
      app.get('/', async (req, res) => await request(req, res));
      app.listen(this.port, callback(this.port));
    }).catch((err) => {
      console.log(`error ${err}`);

    });
  };

  this.event = (worker_id, params, callback) => {
    requestBuilder.postRequest(`http://localhost:${this.configuration.mainPort}/`, {
      "method": "event_to",
      "params": params,
      "worker_id": worker_id
    }).then((response) => {
      callback(response);
    }).catch((err) => {
      console.log(`error ${err}`);
      callback(null);
    });
  };


}

module.exports = Worker;
