JSON.stringifyAligned = require('json-align');
const EventBus = require('./index');
let eventBus = new EventBus({
    debug: true
});

eventBus.prepareWorker({
    worker: {
        id: 9
    }
}, (params) => {
    return {
        "message": `hello ${params.id}, I'm tester`,
        "params_received": params
    };
});


/**
 * Testing get all user endpoint
 */
describe('EventBus Test', function () {
    it('asking to worker', function (done) {
        eventBus.event(`MacBook Pro (914)`, `worker_1`, {
            "message": `hello worker 1`,
            "id": `test`
        }, (response) => {
            console.log(`response from worker_1: ${JSON.stringifyAligned(response)}`);
            done()
        })
    });

    for (let i = 0; i < 1000; i++) {
        it(`asking to worker time ${i}`, function (done) {
            eventBus.event(`MacBook Pro (914)`,`worker_1`, {
                "message": `hello worker 1`,
                "id": `test`
            }, (response) => {
                console.log(`response from worker_1: ${JSON.stringifyAligned(response)}`);
                done()
            })
        });
    }
});
