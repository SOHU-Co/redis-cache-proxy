'use strict';
var net = require('net'),
    Pool = require('./pool'),
    Client = require('./client'),
    Parser = require('./parser'),
    Response = require('./response'),
    floody = require('floody');

exports.createServer = function (port) {
    var pool = new Pool();
    //var client = new Client(6379, '10.2.25.23');
    net.createServer(function (socket) {
        console.log('client connected')
        var parser = new Parser();
        //var response = new Response(floody(socket, { interval: 10 }));
        var response = new Response(socket);
        function reply(reply) {
            pool.select(reply[1], function (err, client) {
                client.queue.push(response);
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
            //console.log('server reci',raw.toString('utf-8'));
            parser.parse(raw, reply, done);
        }); 

        socket.on('end', function () {
            console.log('client disconnected');
        });

        socket.on('error', function () {
            console.log('discache.js',arguments);
        });
    }).listen(port, function () {
        console.log('Server listen port:', port);
    });    
}
