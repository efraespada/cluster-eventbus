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

    this.event = (machine_name, worker_id, params) => {
        return new Promise((resolve, reject) => {
            let connectionConfig = utils.mainMachine();
            if (connectionConfig === null || connectionConfig.ip === undefined || connectionConfig.port === undefined) {
                let res = {
                    error: true,
                    error_message: `invalid config`
                };
                resolve(res);
            }
            requestBuilder.postRequest(`http://${connectionConfig.ip}:${connectionConfig.port}/`, {
                "method": "event_to",
                "params": params,
                "machine_name": machine_name,
                "worker_id": worker_id
            }).then((response) => {
                let res = {
                    response: response,
                    error: false
                };
                resolve(res);
            }).catch((err) => {
                let res = {
                    error: true,
                    error_message: `error ${err}`
                };
                resolve(res);
            });
        })
    };

    this.eventAll = (params, exception_machine_name, exception_worker_id) => {
        return new Promise((resolve, reject) => {
            let connectionConfig = utils.mainMachine();
            if (connectionConfig === null || connectionConfig.ip === undefined || connectionConfig.port === undefined) {
                reject(`main_config_not_found`);
            }
            requestBuilder.postRequest(`http://${connectionConfig.ip}:${connectionConfig.port}/`, {
                "method": "event_to_all",
                "params": params,
                "exception_machine_name": exception_machine_name,
                "exception_worker_id": exception_worker_id
            }).then((response) => {
                let res = {
                    responses: response.responses,
                    error: response.error,
                    error_messages: response.error_messages !== undefined ? response.error_messages : undefined
                };
                resolve(res);
            }).catch((err) => {
                let res = {
                    responses: [],
                    error: true,
                    error_messages: err
                };
                resolve(res);
            });
        })
    };


}

module.exports = Worker;
