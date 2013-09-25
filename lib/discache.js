'use strict';

var net = require('net'),
    Client = require('./client'),
    Parser = require('./parser'),
    Response = require('./response');

exports.createServer = function (port) {
    var client = new Client();
    var parser = new Parser();
    net.createServer(function (socket) {
        console.log('client connected')
        var response = new Response(socket);

        //parser.removeAllListeners('reply');
        parser.on('reply', function (reply) {
            client.rsps.push(response);
            client.write(reply);
        });
        
        function done(data) {
            //client.stream.write(data);
        }
        parser.removeAllListeners('done');
        parser.on('done',done);

        parser.on('error', function () {
            console.log(arguments);
        });

        socket.on('data', function (raw) {
            parser.parse(raw);
        }); 

        socket.on('end', function () {
            console.log('client disconnected');

            console.log(client.rsps.length)
        });

        socket.on('error', function () {
            console.log(arguments);

            console.log(client.rsps.length)
        });
    }).listen(port, function () {
        console.log('Server listen port:', port);
    });    
}
