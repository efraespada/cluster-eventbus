const RequestBuilder = require(`./request`);
const bodyParser = require('body-parser');
const timeout = require('connect-timeout');
const EventUtils = require('./event_utils');
const Error = {
    "process_net_added_to_eventbus": `Process not added to EventBus`,
    "process_already_added_to_eventbus": `Process already added to EventBus`
};

function Master(configuration) {

    let _this = this;
    let utils = new EventUtils();
    let requestBuilder = new RequestBuilder();
    this.configuration = configuration;
    this.mainPort = this.configuration.port;
    this.serverInstance = undefined;

    this.prepare = (machine_name, callback, request) => {
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
        app.post('/', async (req, res) => await request(req, res));
        _this.serverInstance = app.listen(this.mainPort, callback(this.mainPort));
    };

    /**
     * Sends a event to a worker
     * @param machine_name
     * @param worker_id
     * @param params
     * @param callback
     */
    this.event = (machine_name, worker_id, params) => {
        return new Promise((resolve, reject) => {
            let config = utils.getConfig();
            if (config[machine_name] === undefined
                || config[machine_name].workers === undefined
                || config[machine_name].workers[worker_id] === undefined
                || config[machine_name].workers[worker_id].ip === undefined
                || config[machine_name].workers[worker_id].port === undefined) {
                let res = {
                    error: true,
                    error_message: `invalid config`
                };
                resolve(res);
            }
            let ip = config[machine_name].workers[worker_id].ip;
            let port = config[machine_name].workers[worker_id].port;
            if (port < 0) {
                let res = {
                    error: true,
                    error_message: `port not found`
                };
                resolve(res);
            } else {
                requestBuilder.getRequest(`http://${ip}:${port}/`, params).then((response) => {

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
            }
        })
    };

    /**
     * Sends the same event to all workers
     * @param exception_machine_name
     * @param exception_worker_id
     * @param params
     */
    this.eventAll = (params, exception_machine_name, exception_worker_id) => {
        return new Promise((resolve, reject) => {
            let config = utils.getConfig();
            let machineKeys = Object.keys(config);
            let counter = 0;
            let counterResponses = 0;
            let responses = [];
            let errors = [];
            let timer = setTimeout(() => {
                errors.push(`timeout`);
                let response = {
                    responses: responses,
                    error: errors.length > 0,
                    error_messages: errors
                };
                resolve(response);
            }, 1000);

            function endPromise() {
                if (counter > 0 && counter == counterResponses) {
                    clearTimeout(timer);
                    let response = {
                        responses: responses,
                        error: errors.length > 0,
                    };
                    if (errors.length > 0) {
                        response.error_messages = errors;
                    }
                    resolve(response);
                }
            }

            for (let m in machineKeys) {
                let key = machineKeys[m];
                if (exception_machine_name !== undefined && exception_worker_id === undefined && key === exception_machine_name) {
                    continue;
                }
                let machine = config[key];
                if (machine.workers !== undefined) {
                    let workerKeys = Object.keys(machine.workers);
                    for (let wk in workerKeys) {
                        let workerKey = workerKeys[wk];
                        if (exception_machine_name !== undefined && exception_worker_id !== undefined && key === exception_machine_name && workerKey === exception_worker_id) {
                            continue;
                        }
                        let worker = machine.workers[workerKey];
                        if (worker.ip !== undefined && worker.port !== undefined) {
                            counter++;
                            requestBuilder.getRequest(`http://${worker.ip}:${worker.port}/`, params).then((response) => {
                                responses.push(response);
                                counterResponses++;
                                endPromise();
                            }).catch((err) => {
                                counterResponses++;
                                errors.push(`${worker.id} ${worker.id} error: ${err}`);
                                endPromise();
                            });
                        }
                    }
                }
            }
        });
    };

}

module.exports = Master;
