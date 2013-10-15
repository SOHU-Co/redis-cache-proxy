'use stirct';

var net = require('net'),
    Parser = require('./parser'),
    Response = require('./response'),
    FastList = require("fast-list");

var index = 0;

function Client(port, host) {
    this.port = port || 6379;
    this.host = host || 'localhost';
    this.parser = new Parser();
    this.parser.on('error', function (err, buf) {
        console.log('err parsed', buf.toString('utf-8'));
    });
    this.queue = new FastList();
    this.requests = 0;
    this.id = ++index;
    this.connect();
}

Client.prototype.write = function (args) {
    return this.response.write(args);
}

Client.prototype.reply = function (reply) {
    ++this.requests;
    this.queue.shift().write(reply, this.id);
}

Client.prototype.done = function (data) {
    //this.writer.write(data, true);
}

Client.prototype.eol = function (line) {
    return /\r\n$/.test(line.toString('utf-8'));
}

Client.prototype.available = function () {
    return this.response.available(); 
}

Client.prototype.error = function () {
    while (this.queue.length)
        this.queue.shift().error('Connection refused', this.id);
}

Client.prototype.connect = function () {
    var self = this;
    var s = net.createConnection(this.port, this.host);

    s.on("data", function(data) {
        self.parser.parse(data, self.reply.bind(self), self.done.bind(self)); 
    });

    s.on('error', function () {
        console.log('Redis server error');
        console.log('Client.js', arguments);
    });

    s.on('close', function () {
        console.log('Redis server closed', self.host, self.port);
        if (self.queue.length) self.error();
    });

    this.response = new Response(s);
    //return floody(s,{ interval: 10 }); 
}

module.exports = Client;
