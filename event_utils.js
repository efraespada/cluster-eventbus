const fs = require('fs');

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
}

module.exports = EventUtils;