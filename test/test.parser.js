var Parser = require('../lib/parser'),
    net = require('net');

var parser = new Parser();
net.createServer(function (socket) {
    function reply(data) {
        console.log('reply', data);
    }
    
    function done() {}
    socket.on('data', function (data) {
        parser.parse(data,reply,done);
    });
}).listen(8888); 
