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
    this.parser.on('error', function (err, buf) {});
    this.queue = new FastList();
    this.requests = 0;
    this.id = ++index;
    this.node = node;
    this.watcher = null;
    this.createConnection();
    this.createPool();
}
util.inherits(Client, events.EventEmitter);

Client.prototype.write = function (args, response) {
    this.queue.push(response);
    this.socket.write(encoder(args)); 
}

Client.prototype.pull = function (cb) {
    if (this.socket && !this.socketError && this.socket.writable) return cb(null, this.node);
    cb('client not writable', this.node);
}

Client.prototype.reply = function (reply) {
    ++this.requests;
    this.queue.shift().write(reply, this.id);
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
                clearInterval(self.watcher);
                self.watcher = null;
                self.socketError = false;
                self.emit('serverRelive', self.node);
            }
        }); 
    }, 1000);
}

Client.prototype.createPool = function() {
    this.pool = new ConnectionPool(10, { min: 1 , max: 100 }); 
    this.pool.factory(this.createConnection.bind(this));
    this.pool.on('error', function() { 
        console.log('pool error');
    });
    this.pool.retries = 2;
}

Client.prototype.createConnection = function () {
    var self = this;
        
    var s = this.socket = net.createConnection(self.node.port, self.node.host);
    s.on('data', function(data) {
        self.parser.parse(data, self.reply.bind(self)); 
    });
 
    s.on('error', function () {
        console.log('Client.js error', self.node.host, self.node.port);
        if (self.queue.length) self.error();
    });

    s.on('close', function () {
        process.nextTick(function () {
           if (!self.watcher) self.emit('serverError', self.node);
           if (!self.slave) self.startWatcher();
           self.socketError = true;
        });

        console.log('Redis server closed', self.node.host, self.node.port);
    });
    
    return s;
}

module.exports = Client;
