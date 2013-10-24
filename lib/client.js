'use stirct';

var net = require('net')
    util = require('util'),
    events = require('events'),
    Parser = require('./parser'),
    Response = require('./response'),
    ConnectionPool = require('jackpot'),
    FastList = require("fast-list"),
    encoder = require('./encoder');

var index = 0;

function Client(node, slave) {
    this.slave = slave;
    this.parser = new Parser();
    this.parser.on('error', function (err, buf) {
        console.log('err parsed', buf.toString('utf-8'));
    });
    this.queue = new FastList();
    this.requests = 0;
    this.id = ++index;
    this.node = node;
    this.watcher = null;
    this.createPool();
}
util.inherits(Client, events.EventEmitter);

Client.prototype.write = function (args, response) {
    this.queue.push(response);
    this.socket.write(encoder(args)); 
}

Client.prototype.pull = function (cb) {
    this.pool.allocate(function (err, connection) {
        if (err) { 
            if(!this.slave) {
                this.emit('serverFail', this.node);
                this.startWatcher();
            }
            return cb(err);
        }
        this.socket = connection;
        cb(null);
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

Client.prototype.startWatcher = function () {
    if (this.watcher) return;

    var self = this;
    this.watcher = setInterval(function () {
        self.pool.allocate(function (err, connection) {
            if (!err) { 
                self.emit('serverRelive', self.node);
                clearInterval(self.watcher);
                self.watcher = null;
            }
        }); 
    }, 1000);
}

Client.prototype.createPool = function () {
    var self = this;
    console.log(this.id, this.node)
    this.pool = new ConnectionPool(3, { min: 1 , max: 100 }); 
    this.pool.factory(function () {
        var s = net.createConnection(self.node.port, self.node.host);
        s.on('data', function(data) {
            //console.log(self.port, 'get:', data.toString('utf-8').replace(/\r\n/g, ' | '));
            self.parser.parse(data, self.reply.bind(self), self.done.bind(self)); 
        });
    
        s.on('error', function () {
            console.log('Client.js error', self.host, self.port);
            if (self.queue.length) self.error();
        });

        s.on('close', function () {
            console.log('Redis server closed', self.node.host, self.node.port);
        });

        return s;
    });

    this.pool.on('error', function() { 
        console.log('pool error');
    });

    this.pool.retries = 2;
}

module.exports = Client;
