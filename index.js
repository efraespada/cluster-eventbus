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
    if (this.configuration.name === undefined) {
        this.configuration.name = `Cluster`;
    }
    if (this.configuration.test === undefined) {
        this.configuration.test = false;
    }
    this.configuration_file = undefined;
    this.machineName = computerName();
    this.debug = this.configuration.debug || false;
    this.master = null;
    this.currentWorker = null;

    this.closeAll = async () => {
        await this.eventAll({
            "method": "close_server"
        });
        if (this.master.serverInstance !== undefined) {
            if (this.debug) {
                console.log("closing master");
            }
            this.master.serverInstance.close();
        }
        process.exit(0);
    };

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
                console.error(`Null port. Error starting eventbus ${this.currentWorker.configuration.machineName} (id: ${this.currentWorker.configuration.id})`)
            } else if (this.debug) {
                console.log(`Eventbus ${this.currentWorker.configuration.id} started (${port})`)
            }
        }, async (server, req, res) => {
            let body = null;
            if (req.body !== undefined && Object.keys(req.body).length > 0) {
                body = req.body;
            } else if (req.query !== undefined && Object.keys(req.query).length > 0) {
                body = req.query;
            } else {
                res.send(`body_not_found`);
                return;
            }
            if (body["method"] !== undefined && body["method"] === "close_server") {
                if (server !== undefined) {
                    res.json({});
                    if (this.debug) {
                        console.log("closing server");
                    }
                    server.stop();
                } else {
                    console.error("error closing server")
                }
                process.exit(0);
                return;
            }
            let response = await callback(body);
            res.json(response);
        })
    };

    this.event = async (machine_name, worker_id, params) => {
        if (this.currentWorker !== null) {
            if (this.configuration.test) {
                return await this.currentWorker.event(this.machineName, worker_id, params);
            }
            if (worker_id === this.currentWorker.configuration.id) {
                return;
            }
            return await this.currentWorker.event(machine_name, worker_id, params)
        } else {
            return await this.master.event(machine_name, worker_id, params);
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

    this.defineMaster = (callback) => {
        if (this.configuration.test) {
            console.warn(`${this.configuration.name} running on test mode`)
        }
        this.master = new Master(this.configuration);
        this.master.prepare(this.machineName, (port) => {
            /**
             * Main EventBus process started
             */
            callback(port);
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

                    let config = utils.prepareCluster(query.machine_name, query.worker_id, query.ip, this.configuration.port);
                    let port = config[query.machine_name].workers[query.worker_id].port;
                    if (port < 0) {
                        console.log("port_not_found")
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

    /**
     * Prepares the configuration file and returns it.
     */
    this.prepareConfig = () => {
        let configPath = `${process.cwd()}/config.json`;
        if (!fs.existsSync(configPath)) {
            let json = {};
            json[`${this.machineName}`] = require(__dirname + `/config_files/default_config_machine`);
            fs.writeFileSync(configPath, JSON.stringifyAligned(json), 'utf8');
        }
        let content = utils.getConfig();
        try {
            return JSON.parse(content);
        } catch (e) {
            return JSON.parse(JSON.stringify(content));
        }
    };


    /**
     * Prepares the configuration file and returns it.
     */
    this.prepareConfigMaster = () => {
        let configPath = `${process.cwd()}/config.json`;
        let configuration = this.prepareConfig();
        if (configuration[this.machineName] !== undefined) {
            configuration[this.machineName].isCore = true;
            configuration[this.machineName].master.ip = ip.address();
            configuration[this.machineName].master.port = this.configuration.port;
            fs.writeFileSync(configPath, JSON.stringifyAligned(configuration), 'utf8');
        }
        return configuration;
    };

    this.resetConfig = () => {
        let configPath = `${process.cwd()}/config.json`;
        if (fs.existsSync(configPath)) {
            let configuration = this.prepareConfig();

            let machine_keys = Object.keys(configuration);
            for (let machine_name of machine_keys) {
                let machine = configuration[machine_name];
                if (machine_name === EventBus.MACHINE_NAME) {
                    if (!machine.isCore) {
                        configuration[machine_name].isCore = true;
                        configuration[machine_name].master = {
                            ip: ip.address(),
                            port: this.configuration.port,
                            debug: this.debug
                        }
                    }
                } else {
                    delete configuration[machine_name]
                }
            }

            fs.writeFileSync(configPath, JSON.stringifyAligned(configuration), 'utf8');

            this.configuration_file = this.prepareConfig();
            this.prepareConfigMaster();
        }
    };

    this.update_core = (isCore) => {
        let configPath = `${process.cwd()}/config.json`;
        let configuration = this.prepareConfig();
        if (configuration[this.machineName] !== undefined) {
            configuration[this.machineName].isCore = isCore;
            fs.writeFileSync(configPath, JSON.stringifyAligned(configuration), 'utf8');
        }
    };

    this.cluster = (cluster) =>  {
        this.update_core(this.configuration.isCore !== undefined && this.configuration.isCore);

        this.configuration_file = this.prepareConfig();

        if (cluster.isMaster) {
            if (this.configuration.core === undefined && !this.configuration.test) {
                if (this.debug) {
                    console.log(`${this.configuration.name} EventBus running on ${this.machineName}. [ 🔳 core not defined ]`);
                }
                utils.coreNotDefined(this.machineName);
            }
        }
        if ((this.configuration.core === this.machineName || this.configuration.test) && cluster.isMaster) {
            this.prepareConfigMaster();
            this.defineMaster((port) => {
                if (this.debug) {
                    let msg = this.machineName === this.configuration.core ? ` 🔲 core ` : ` 🔲 ${this.configuration.core} `;
                    msg = this.configuration.test ? ` 🔲 ${this.machineName} ` : msg;
                    console.log(`${this.configuration.name} EventBus running on ${this.machineName} [${msg}]`);
                }
            });
        }
        return this;
    }

}


exports = module.exports = EventBus;
exports.in_service_mode = () => {
    let machine_name = computerName();

    let configPath = `${process.cwd()}/config.json`;
    if (!fs.existsSync(configPath)) {
        let json = {};
        json[`${machine_name}`] = require(__dirname + `/config_files/default_config_machine`);
        fs.writeFileSync(configPath, JSON.stringifyAligned(json), 'utf8');
    }
    let configuration = require(configPath);
    if (configuration[machine_name] !== undefined) {
        return !configuration[machine_name].isCore;
    }
    else return false;

};
exports.Master = Master;
exports.Worker = Worker;
exports.MACHINE_NAME = computerName();

