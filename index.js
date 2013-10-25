'use strict';
var net = require('net'),
    Pool = require('./lib/pool'),
    Parser = require('./lib/parser'),
    Response = require('./lib/response');

exports.createServer = function (servers) {
    var pool = new Pool(servers);
    var server = net.createServer(function (socket) {
        console.log('client connected')
        var parser = new Parser();
        var response = new Response(socket);
        function reply(reply) {
            pool.select(reply[1], function (err, client) {
               response.commandQueue.push(client.id);
               if (err) return response.error('Connection refused', client.id);
               client.write(reply, response);
            });
        }

        parser.on('error', function (err, buf) {});

        socket.on('data', function (raw) {
            setImmediate(function () {
                parser.parse(raw, reply);
            });
        }); 

        socket.on('end', function () {
            console.log('client disconnected');
        });

        socket.on('error', function () {
        });
    });

    return server;
}
