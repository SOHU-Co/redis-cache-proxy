'use stirct';

var net = require('net'),
    Parser = require('./parser'),
    Response = require('./response'),
    ConnectionPool = require('jackpot'),
    FastList = require("fast-list"),
    encoder = require('./encoder');

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
    this.socketerror = false;
    this.createPool();
}

Client.prototype.write = function (args, response) {
    this.pool.pull(function (err, connection) {
        if (err) {
            console.log('pull error');
            this.port = 6380;
            return response.error('Connection refused', this.id);
        }
        this.queue.push(response);
        connection.write(encoder(args)); 
    }.bind(this));
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

Client.prototype.error = function () {
    while (this.queue.length)
        this.queue.shift().error('Connection refused', this.id);
}

Client.prototype.createPool = function () {
    var self = this;
    this.pool = new ConnectionPool(3, { min: 1 , max: 100 }); 
    this.pool.factory(function () {
        var s = net.createConnection(self.port, self.host);
        s.on('data', function(data) {
            //console.log(self.port, 'get:', data.toString('utf-8').replace(/\r\n/g, ' | '));
            self.parser.parse(data, self.reply.bind(self), self.done.bind(self)); 
        });
    
        s.on('error', function () {
            console.log('Client.js error', self.host, self.port);
            if (self.queue.length) self.error();
        });

        s.on('close', function () {
            console.log('Redis server closed', self.host, self.port);
        });

        return s;
    });

    this.pool.on('error', function() { 
        this.error = true;
        console.log('pool error');
    });

    this.pool.retries = 2;
}

module.exports = Client;
