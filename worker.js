const RequestBuilder = require(`./request`);
const bodyParser = require('body-parser');
const timeout = require('connect-timeout');
const EventUtils = require('./event_utils');

function Worker(configuration) {

    let utils = new EventUtils();
    let requestBuilder = new RequestBuilder();

    this.configuration = configuration || {};
    if (this.configuration.id === undefined) {
        throw new Error(`Process ID not defined`);
    }
    this.port = null;

    this.prepare = (callback, request) => {
        let connectionConfig = utils.mainMachine();
        if (connectionConfig === null || connectionConfig.ip === undefined || connectionConfig.port === undefined) {
            console.error(JSON.stringify(connectionConfig));
            callback(null);
            return
        }
        requestBuilder.getRequest(`http://${connectionConfig.ip}:${connectionConfig.port}/`, {
            "method": "get_port",
            "ip": this.configuration.ip,
            "machine_name": this.configuration.machineName,
            "worker_id": this.configuration.id
        }).then((response) => {
            if (response.worker_id !== this.configuration.id) {
                console.error(`worker id mismatch ${this.configuration.id} - ${response.worker_id}`);
                return
            }
            this.port = response.port;
            const express = require('express');
            const app = express();
            app.use(bodyParser.urlencoded({extended: true}));
            app.use(bodyParser.json({limit: '50mb'}));
            app.use(timeout('120s'));
            app.use(function (req, res, next) {
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

    this.event = (machine_name, worker_id, params, callback) => {
        let connectionConfig = utils.mainMachine();
        if (connectionConfig === null || connectionConfig.ip === undefined || connectionConfig.port === undefined) {
            callback(null);
            return
        }
        requestBuilder.postRequest(`http://${connectionConfig.ip}:${connectionConfig.port}/`, {
            "method": "event_to",
            "params": params,
            "machine_name": machine_name,
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
