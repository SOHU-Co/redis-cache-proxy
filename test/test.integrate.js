var redis = require('redis'),
    proxy = require('../index'),
    config = require('../config/config.json')['test'],
    client, clients;

/*
 *  Integrate test
 *  Firstly, we should run redis servers listed in config/config.json[test]
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
        proxy.createServer(config).listen(config.port, function () {
            console.log('Proxy listening port', config.port);
            client = redis.createClient(config.port);
        });
        // clear test database
        var clients = createClients(config.servers),
            count = 0;
        var callback = function (err) {
            if (++count === clients.length) done(err);
        }
        clients.forEach(function (c) {
            c.flushdb(callback);
        }); 

    });

    describe('1k requests', function () {
        it('should return in sequence', function (done) {
            var count = 1000,
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

    describe('commands', function () {
        it('should return error to unsupported commands', function (done) {
            client.flushdb(function (err) {
                err.should.be.an.instanceof(Error);
                err.message.should.equal("ERR unsupported command 'flushdb'");
                done();
            }); 
        }); 
    });

    describe('when no redis server alive', function () {
        it('should return error', function (done) {
           var client, config = { servers: { server_1: 'localhost:77777' }, redisVersion: '2.1.6', port: 63798 };
           proxy.createServer(config).listen(config.port, function () {
                client = redis.createClient(config.port);
                client.get('key', function (err) {
                    err.should.be.an.instanceof(Error);
                    err.message.should.equal("ERR Connection refused");
                    done();
                });
           });
        })
    });

    describe('when no server given', function () {
        it('should throw error', function () {
            var config = {port: '999999'};
            (function(){ proxy.createServer(config); }).should.throw('Servers can not be blank!');
        });
    });
});
