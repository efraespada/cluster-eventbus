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
    this.machineName = computerName();
    if (this.configuration.core === undefined) {
        utils.coreNotDefined(this.machineName);
    }
    this.debug = this.configuration.debug || false;
    this.master = null;
    this.currentWorker = null;

    /**
     * Retrieves the needed port for the given worker
     * and launch it
     * @param cluster
     * @param callback
     */
    this.prepareWorker = (cluster, callback) => {
        this.currentWorker = new Worker({
            id: `worker_${cluster.worker.id}`,
            ip: ip.address(),
            machineName: this.machineName,
            mainPort: this.configuration.port
        });
        this.currentWorker.prepare((port) => {
            if (port === null) {
                console.error(`error starting eventbus ${this.currentWorker.configuration.machineName} ${this.currentWorker.configuration.id} started (${port})`)
            }
            if (this.debug) {
                console.log(`eventbus ${this.currentWorker.configuration.id} started (${port})`)
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

    this.event = (machine_name, worker_id, params) => {
        if (this.currentWorker !== null) {
            if (worker_id === this.currentWorker.configuration.id) {
                return;
            }
            this.currentWorker.event(machine_name, worker_id, params)
        } else {
            this.master.event(machine_name, worker_id, params);
        }
    };

    this.eventAll = async (params, exception_machine_name, exception_worker_id) => {
        if (this.currentWorker !== null) {
            return await this.currentWorker.eventAll(
                params,
                exception_machine_name || this.machineName,
                exception_worker_id || this.currentWorker.configuration.id)
        } else {
            return await this.master.eventAll(params, exception_machine_name, exception_worker_id);
        }
    };

    this.defineMaster = () => {
        this.master = new Master(this.configuration);
        this.prepareConfigMaster();
        this.master.prepare(this.machineName, (port) => {
            /**
             * Main EventBus process started
             */
            if (this.debug) {
                console.log(`eventbus master started (${ip.address()}:${port})`)
            }
        }, async (req, res) => {
            /**
             * Process request
             */
            if (req.body !== undefined && req.body.method !== undefined) {
                let body = req.body;
                if (body.method === "event_to"
                    && body.machine_name !== undefined
                    && body.worker_id !== undefined
                    && body.params !== undefined) {
                    let response = await this.event(body.machine_name, body.worker_id, body.params);
                    let r = response || {};
                    res.json(r);
                } else if (body.method === "event_to_all"
                    && body.exception_machine_name !== undefined
                    && body.exception_worker_id !== undefined
                    && body.params !== undefined) {
                    let response = await this.eventAll(body.params, body.exception_machine_name, body.exception_worker_id);
                    let r = response || {};
                    res.json(r);
                } else {
                    res.send(`body_not_found`)
                }
            } else if (req.query !== undefined && req.query.method !== undefined) {
                let query = req.query;
                if (query.method === "get_port"
                    && query.machine_name !== undefined
                    && query.worker_id !== undefined
                    && query.ip !== undefined) {
                    utils.prepareCluster(query.machine_name, query.worker_id, query.ip, this.configuration.port);
                    let port = utils.getConfig()[query.machine_name].workers[query.worker_id].port;
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


    this.prepareConfigMaster = () => {
        let configPath = `${process.cwd()}/config.json`;
        if (!fs.existsSync(configPath)) {
            let json = {};
            json[`${this.machineName}`] = require(`./config_files/default_config_machine`);
            fs.writeFileSync(configPath, JSON.stringifyAligned(json), 'utf8');
        }
        let conf = require(configPath);
        if (conf[this.machineName] !== undefined) {
            conf[this.machineName].isCore = true;
            conf[this.machineName].master.ip = ip.address();
            conf[this.machineName].master.port = this.configuration.port;
            fs.writeFileSync(configPath, JSON.stringifyAligned(conf), 'utf8');
        }
    };

    this.cluster = (cluster) =>  {
        if (this.configuration.core === this.machineName && cluster.isMaster) {
            this.defineMaster();
        }
        return this;
    }

}


exports = module.exports = EventBus;
exports.Master = Master;
exports.Worker = Worker;

