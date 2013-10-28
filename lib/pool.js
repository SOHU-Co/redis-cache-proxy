'use strict';

var HashRing = require('hashring'),
    Client = require('../lib/client');

var Pool = module.exports = function (servers) {
    this.serverNames = Object.keys(servers);
    this.ring = new HashRing(this.serverNames, 'md5', 10000);
    this.pool = {};
    this.servers = {};
    this.parseServer(servers);
    this.initPool();
}

Pool.prototype.parseServer = function (servers) {
    for (var serverName in servers) {
        var x = (servers[serverName]).split(':');
        this.servers[serverName] = new Node(serverName, x[0], x[1]);
    }
}

Pool.prototype.select = function (key, cb) {
    var self = this;
    var serverName = this.ring.get(key);
    var client = this.pool[serverName] || this.addClient(serverName);
    client.pull(function (err, node) {
        if (err) { 
            self.getSlave(node.name, function (err, slave) {
                if(err) return cb(err, client);
                return cb(null, slave); 
            });
            return;
        }
        
        cb(null, client); 
    });
}

Pool.prototype.addClient = function (serverName, slave) {
    var server = this.servers[serverName];
    var client = new Client(server, slave);
    if (slave) return this.pool[serverName] = client;
    
    client.on('serverError', function (node) {
        var index = this.serverNames.indexOf(node.name);
        if (~index) this.serverNames.splice(index,1);
        var slaveName = 'slaveof' + node.name;
        this.getSlave(node.name, function (err) {
            if (!err) this.ring.swap(node.name, slaveName);
        }.bind(this));
    }.bind(this));

    client.on('serverFail', function (node) {
        this.ring.swap(node.name, 'slaveof'+node.name);
    }.bind(this));

    client.on('serverRelive', function (node) {
        console.log('server relive', node);
        this.serverNames.push(node.name);
        var slaveName = 'slaveof' + node.name;
        delete this.servers[slaveName];
        delete this.pool[slaveName];
        this.ring.swap(slaveName, node.name);
    }.bind(this));
    
    return this.pool[serverName] = client;
}

Pool.prototype.getSlave = function (masterName, cb) {
    var self = this, 
        next = this.nextSlave(this.serverNames), 
        nextSlave = 'slaveof' + masterName,
        s = self.servers[next];
   
    // No server alive
    if (!next) return cb && cb('No server alive');
    self.servers[nextSlave] = self.servers[nextSlave] || new Node(nextSlave, s.host, s.port);
    var master = this.pool[next];
    
    master.pull(function (err) {
        if (err) return setImmediate(function () { self.getSlave(masterName, cb); });
        var slave = self.pool[nextSlave] || self.addClient(nextSlave, true);
        cb && cb(null, slave);
    });
}

Pool.prototype.initPool = function () {
    this.serverNames.forEach(function (server) {
        this.addClient(server);
    }.bind(this));
}

Pool.prototype.nextSlave = (function () {
    var first = 0;
    return function (servers) {
        first = (first+1) % servers.length || 0;
        return servers[first]; 
    }
})();

function Node (name, host, port) {
    this.name = name;
    this.host = host;
    this.port = port;
}
