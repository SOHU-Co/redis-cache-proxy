'use stirct';

var net = require('net'),
    Parser = require('./parser'),
    Response = require('./response'),
    FastList = require("fast-list");

function Client(port, host) {
    this.port = port || 6379;
    this.host = host || 'localhost';
    this.parser = new Parser();
    this.parser.on('error', function (err, buf) {
        console.log('err parsed', buf.toString('utf-8'));
    });
    this.queue = new FastList();
    this.connect();
}

Client.prototype.write = function (args) {
    this.response.write(args);
}

Client.prototype.reply = function (reply) {
    this.queue.shift().write(reply);
}

Client.prototype.done = function (data) {
    //this.writer.write(data, true);
}

Client.prototype.eol = function (line) {
    return /\r\n$/.test(line.toString('utf-8'));
}

Client.prototype.connect = function () {
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
    
    this.response = new Response(s);
    //return floody(s,{ interval: 10 }); 
}

module.exports = Client;
