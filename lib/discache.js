'use strict';
var net = require('net'),
    cluster = require('cluster'),
    cpus = require('os').cpus().length,
    Pool = require('./pool'),
    Parser = require('./parser'),
    Response = require('./response');

exports.createServer = function (config) {
    var pool = new Pool(config.servers);
    //var client = new Client(6379, '10.2.25.23');
    if (cluster.isMaster) {
        for (var i=0; i<cpus; i++)
        cluster.fork();
    } else {
        net.createServer(function (socket) {
            console.log('client connected')
            var parser = new Parser();
            //var response = new Response(floody(socket, { interval: 10 }));
            var response = new Response(socket, true);
            function reply(reply) {
                pool.select(reply[1], function (err, client) {
                    response.commandQueue.push(client.id);
                    if (!client.available())
                        return response.error('Connection refused', client.id);
                        
                    client.queue.push(response);
                    //if (client.port == 6380) return setTimeout(function () {client.write(reply)}, 100);
                    client.write(reply);
                });
            }
        
            function done(data) {
                //client.stream.write(data);
            }

            parser.on('error', function (err, buf) {
                console.log('err parsed', err, buf.toString('utf-8').slice(0,40));
            });

            socket.on('data', function (raw) {
                parser.parse(raw, reply, done);
            }); 

            socket.on('end', function () {
                console.log('client disconnected');
            });

            socket.on('error', function () {
                console.log('discache.js',arguments);
            });

        }).listen(config.port, function () {
            console.log('server listening', config.port);
        }); 
    }
}
