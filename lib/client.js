'use stirct';

var net = require('net')
    util = require('util'),
    events = require('events'),
    Parser = require('./parser'),
    Response = require('./response'),
    FastList = require("fast-list"),
    encoder = require('./encoder');

function Client(node, slave) {
    this.slave = slave;
    this.parser = new Parser();
    this.parser.on('error', function (err, buf) {});
    this.queue = new FastList();
    this.requests = 0;
    this.id = Client.nextId();
    this.node = node;
    this.watcher = null;
    this.retryInterval = 1000;
    this.connected = false;
    this.createConnection();
}
util.inherits(Client, events.EventEmitter);

Client.nextId = (function () {
    var id = 0;
    return function () {
        return id++;
    }
})();

Client.prototype.write = function (args, response) {
    this.queue.push(response);
    this.socket.write(encoder(args)); 
}

Client.prototype.pull = function (cb) {
    if (this.socket && 
        !this.socketError && 
        this.socket.writable &&
        this.connected) return cb(null, this.node);
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
    var self = this;

    if (self.watcher) return;
    
    self.emit('serverError', self.node);
    self.socketError = true;
    self.connected = false;

    self.watcher = setInterval(function () {
        self.socket.connect(self.node.port, self.node.host);
    }, self.retryInterval);
}

Client.prototype.createConnection = function () {
    var self = this;
        
    var s = this.socket = net.createConnection(self.node.port, self.node.host);
    s.on('data', function(data) {
        self.parser.parse(data, self.reply.bind(self)); 
    });
 
    s.on('error', function () {
        if (self.queue.length) self.error();
    });

    s.on('close', function () {
        console.log('Redis server closed', self.node.host, self.node.port);
        if (!self.slave) self.startWatcher();
    });

    s.on('end', function () {
        console.log('Redis connection end', self.node.host, self.node.port);
        if (!self.slave) self.startWatcher();
    });

    s.on('connect', function () {
        if (self.socketError) self.emit('serverRelive', self.node);
        self.connected = true;
        clearInterval(self.watcher);
        self.watcher = null;
        self.socketError = false;
    });
    
    return s;
}

module.exports = Client;
