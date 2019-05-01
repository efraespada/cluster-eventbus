JSON.stringifyAligned = require('json-align');
const EventBus = require('./index');
let eventBus = new EventBus({
    test: true,
    debug: true,
    port: 4000
}).cluster({
    isMaster: true
});


eventBus.prepareWorker({
    worker: {
        id: 2
    }
}, (params) => {
    return {
        "message": `hello ${params.id}, I'm worker 2`,
        "params_received": params
    };
});

eventBus.prepareWorker({
    worker: {
        id: 3
    }
}, (params) => {
    return {
        "message": `hello ${params.id}, I'm worker 3`,
        "params_received": params
    };
});

setTimeout(() => {
    /**
     * Testing get all user endpoint
     */
    describe('EventBus Test', () => {
        for (let i = 0; i < 1000; i++) {
            it(`asking to worker time ${i}`, async () => {
                return await eventBus.event(``, `worker_2`, {
                    "message": `hello worker 2`,
                    "id": `test`
                });
            });
        }
        it('asking to all', async () => {
            return await eventBus.eventAll({
                "message": `hello workers`,
                "id": `test`
            });
        });
    });
}, 3000);
