const fs = require('fs');
JSON.stringifyAligned = require('json-align');

function EventUtils() {

    this.getConfig = () => {
        let path = `${process.cwd()}/config.json`;
        if (fs.existsSync(path)) {
            return require(path)
        }
        return null;
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

    this.getPortForWorker = (machine_name, worker_id, main_port) => {
        let config = this.getConfig();
        let port = -1;
        if (config[machine_name] === undefined) {
            return port;
        }
        if (config[machine_name].workers === undefined) {
            return port;
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
            json[`${machine_name}`] = require(`./config_files/default_config_machine`);
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
                conf[machine_name].workers[worker_id].port = this.getPortForWorker(machine_name, worker_id, main_port);
            }
            fs.writeFileSync(configPath, JSON.stringifyAligned(conf), 'utf8');
        }
    };

    this.mainMachine = () => {
        let ip = null;
        let port = null;
        let name = null;
        let config = this.getConfig();
        let machineKeys = Object.keys(config);
        for (let m in machineKeys) {
            let machineKey = machineKeys[m];
            let machine = config[machineKey];
            if (machine.isCore) {
                name = machineKey;
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