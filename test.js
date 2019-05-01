JSON.stringifyAligned = require('json-align');
const EventBus = require('./index');

let conf = {
    test: true,
    debug: true,
    port: 4000
};

new EventBus(conf).cluster({
    isMaster: true
});

let eventBusWorkerA = new EventBus(conf).cluster({
    isMaster: false
});

let eventBusWorkerB = new EventBus(conf).cluster({
    isMaster: false
});


eventBusWorkerA.prepareWorker({
    worker: {
        id: 2
    }
}, (params) => {
    return {
        "message": `hello ${params.id}, I'm worker 2`,
        "params_received": params
    };
});

eventBusWorkerB.prepareWorker({
    worker: {
        id: 3
    }
}, (params) => {
    return {
        "message": `hello ${params.id}, I'm worker 3`,
        "params_received": params
    };
});

describe('EventBus Test', () => {
    for (let i = 0; i < 1000; i++) {
        it(`asking to worker time ${i}`, async () => {
            return await eventBusWorkerA.event(``, `worker_3`, {
                "message": `hello worker 2`,
                "id": `test`
            });
        });
    }
    it('asking to all', async () => {
        return await eventBusWorkerB.eventAll({
            "message": `hello workers`,
            "id": `test`
        });
    });
});
