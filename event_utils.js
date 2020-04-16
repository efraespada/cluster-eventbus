const fs = require('fs');
JSON.stringifyAligned = require('json-align');

function EventUtils() {

    this._prim_getConfig = () => {
        let path = `${process.cwd()}/config.json`;
        if (fs.existsSync(path)) {
            let content = fs.readFileSync(path, 'utf-8');
            try {
                return JSON.parse(content);
            } catch (e) {
                return JSON.parse(JSON.stringify(content));
            }
        }
        return null;
    };

    this.getConfig = () => {
        let config = this._prim_getConfig();
        if (JSON.stringify(config).length < 3) {
            return this.getConfig()
        }
        return config;
    };

    this.prepareConfigWorker = (machine_name, worker_id, ip, port) => {
        let configPath = `${process.cwd()}/config.json`;
        let conf = this.getConfig();
        if (conf === null) {
            let json = {};
            json[`${machine_name}`] = require(`./config_files/default_config_machine`);
            delete json[`${machine_name}`].master;
            fs.writeFileSync(configPath, JSON.stringifyAligned(json), 'utf8');
            conf = json;
        }
        if (conf[machine_name] !== undefined) {
            if (conf[machine_name].workers === undefined) {
                conf[machine_name].workers = {};
            }
            if (conf[machine_name].workers[worker_id] === undefined) {
                conf[machine_name].workers[worker_id] = {};
            }
            conf[machine_name].workers[worker_id].id = worker_id;
            conf[machine_name].workers[worker_id].ip = ip;
            conf[machine_name].workers[worker_id].port = port;
            fs.writeFileSync(configPath, JSON.stringifyAligned(conf), 'utf8');
        }
    };

    this.getPortForWorker = (config, machine_name, worker_id, main_port) => {
        let port = -1;
        if (config[machine_name] === undefined) {
            return main_port;
        }
        if (config[machine_name].workers === undefined) {
            return main_port;
        }
        let worker = config[machine_name].workers[worker_id];
        if (worker !== undefined && worker.port !== undefined) {
            port = worker.port;
        } else {
            port = main_port;
            let workers_ids = Object.keys(config[machine_name].workers);
            for (let w in workers_ids) {
                if (port < config[machine_name].workers[workers_ids[w]].port) {
                    port = config[machine_name].workers[workers_ids[w]].port;
                }
            }
            port++;
        }
        return port;
    };

    this.prepareCluster = (machine_name, worker_id, ip, main_port) => {
        let configPath = `${process.cwd()}/config.json`;
        let conf = this.getConfig();
        let machine = this.mainMachine();
        if (conf === null) {
            let json = {};
            json[machine_name] = require(`./config_files/default_config_machine`);
            // TODO check if is main machine for remove master key-pair
            if (machine !== null && machine.name !== undefined && machine.name !== machine_name) {
                delete json[`${machine_name}`].master;
            }
            fs.writeFileSync(configPath, JSON.stringifyAligned(json), 'utf8');
            conf = json;
        }
        if (conf[machine_name] === undefined) {
            conf[machine_name] = {};
        }
        if (conf[machine_name] !== undefined) {
            if (conf[machine_name].workers === undefined) {
                conf[machine_name].workers = {};
            }
            if (conf[machine_name].workers[worker_id] === undefined) {
                conf[machine_name].workers[worker_id] = {};
            }
            conf[machine_name].workers[worker_id].id = worker_id;
            conf[machine_name].workers[worker_id].ip = ip;
            if (conf[machine_name].workers[worker_id].port === undefined) {
                conf[machine_name].workers[worker_id].port = this.getPortForWorker(conf, machine_name, worker_id, main_port);
            }
            fs.writeFileSync(configPath, JSON.stringifyAligned(conf), 'utf8');
        }
        return conf;
    };

    this.mainMachine = () => {
        let ip = null;
        let port = null;
        let name = null;
        let config = this.getConfig();
        let machineKeys = Object.keys(config);
        for (let key of machineKeys) {
            let machine = config[key];
            if (machine.isCore) {
                name = key;
                ip = machine.master.ip;
                port = machine.master.port;
                break;
            }
        }

        if (ip === null || port === null || ip === undefined || port === undefined) {
            return null
        }
        return {
            name: name,
            ip: ip,
            port: port
        }
    };

    this.coreNotDefined = (core_machine) => {
        throw Error(`EventBus core machine not defined. Run:

let eventBus = new EventBus({
    core: \`${core_machine}\`,
    debug: true
}).cluster(cluster);
`)
    };
}

module.exports = EventUtils;
