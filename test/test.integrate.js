var redis = require('redis'),
    config = require('../config/config.json')['test'],
    client, clients;

/*
 *  Integrate test
 *  Firstly, we should run a discache server at 63799(default),
 *  and redis servers list in config/config.json
 *  NODE_ENV=test node index.js
 */


/*
 *  Helper methods
 */ 
function createClients(servers) {
    var out = [];
    for (var name in servers) {
        var x = (servers[name]).split(':');
        out.push(redis.createClient(x[1], x[0]));
    }
    return out;
} 

describe('Integrate', function () {
    before(function clearDatabase(done) {
        // clear redis database
        var clients = createClients(config.servers),
            count = 0;
        var callback = function (err) {
            if (++count === clients.length) done(err);
        }
        clients.forEach(function (c) {
            c.flushdb(callback);
        }); 

        client = redis.createClient(config.port);
    });

    describe('1k requests', function () {
        it('should return in sequence', function (done) {
            var count = 10 * 1000,
                total = 0;
            for(var i=1; i<= count; i++) {
                (function (i) {
                    client.set('keyyy'+i, i, function (err) {
                        client.get('keyyy'+i, function (err,data) {
                            if (!err) data.should.equal(i+'');
                            if (++total === count) done();
                        })
                    });
                })(i);
            }
        });
    });
});
