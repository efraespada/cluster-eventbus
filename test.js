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
        id: 99
    }
}, (params) => {
    return {
        "message": `hello ${params.id}, I'm tester`,
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
                return await eventBus.event(`MacBook Pro (914)`, `worker_1`, {
                    "message": `hello worker 1`,
                    "id": `test`
                });
            });
        }
        it('asking to all', async () => {
            return await eventBus.eventAll({
                "message": `hello worker 1`,
                "id": `test`
            });
        });
    });
}, 3000);
