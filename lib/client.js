'use stirct';

var net = require('net'),
    Parser = require('./parser'),
    FastList = require("fast-list");

function Client() {
    this.parser = new Parser();
    this.queue = new FastList();
    this.connect();
}

Client.prototype.connect = function () {
    this.stream = this.createConnection();
    this.parser.on('error', function (err, buf) {
        console.log('err parsed', buf.toString('utf-8'));
    });
}

Client.prototype.write = function (args) {
    var str = "*" + args.length + "\r\n";
    for (var i=0, l=args.length; i<l; i++) {
        var arg = args[i];
        if(typeof arg !== 'string') {
            arg = String(arg);
        }
        str += "$" + Buffer.byteLength(arg) + "\r\n" + arg + "\r\n";
    }
    this.stream.write(str);
}

//var count=0, max=0;
Client.prototype.reply = function (reply) {
    //if (this.queue.length >= max) max = this.queue.length;
    //if (++count === 1000000) { console.log('max is:', max); count=0}
    this.writer = this.queue.shift();
    this.writer.write(reply); 
}

Client.prototype.done = function (data) {
    //console.log('client socket id', this.writer.writer.id);
    //this.writer.write(data, true);
}

Client.prototype.ready = function (pong) {
    if (pong === 'PONG') {
        this.isReady = true;
        console.log('reday')
    }
}

Client.prototype.eol = function (line) {
    return /\r\n$/.test(line.toString('utf-8'));
}

Client.prototype.createConnection = function (port, host) {
    var s = net.createConnection(port || 6379, '10.2.25.23' || host);
    s.on("data", function(data) {
        this.parser.parse(data, this.reply.bind(this), this.done.bind(this)); 
    }.bind(this));

    s.on('error', function () {
        console.log('Client.js', arguments);
    });

    return s; 
}

module.exports = Client;
