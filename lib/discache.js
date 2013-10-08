'use strict';
var net = require('net'),
    Client = require('./client'),
    Parser = require('./parser'),
    Response = require('./response');

exports.createServer = function (port) {
    var client = new Client();
    net.createServer(function (socket) {
        var parser = new Parser();
        console.log('client connected')
        var response = new Response(socket);
        
        function reply(reply) {
            client.queue.push(response);
            client.write(reply);
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
            console.log(client.queue.length)
        });

        socket.on('error', function () {
            console.log('discache.js',arguments);

            console.log(client.queue.length)
        });
    }).listen(port, function () {
        console.log('Server listen port:', port);
    });    
}
