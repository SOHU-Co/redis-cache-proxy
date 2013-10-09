'use stirct';

var net = require('net'),
    Parser = require('./parser'),
    FastList = require("fast-list");

function Client(port, host) {
    this.port = port || 6379;
    this.host = host || 'localhost';
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

Client.prototype.reply = function (reply) {
    this.writer = this.queue.shift();
    this.writer.write(reply); 
}

Client.prototype.done = function (data) {
    //this.writer.write(data, true);
}

Client.prototype.eol = function (line) {
    return /\r\n$/.test(line.toString('utf-8'));
}

Client.prototype.createConnection = function () {
    var s = net.createConnection(this.port, this.host);
    s.on("data", function(data) {
        this.parser.parse(data, this.reply.bind(this), this.done.bind(this)); 
    }.bind(this));

    s.on('error', function () {
        console.log('Client.js', arguments);
    });

    s.on('close', function () {
        console.log('Client closed', this.host, this.port);
    }.bind(this));

    return s;
    //return floody(s,{ interval: 10 }); 
}

module.exports = Client;
