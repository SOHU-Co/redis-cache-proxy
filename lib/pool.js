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
        this.servers[serverName] = { name: serverName, host: x[0], port: x[1] };
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

        this.getSlave(node.name, function (err, slave) {
            this.servers['slave'+node.name] = { name: 'slave'+node.name, host: slave.node.host, port: slave.node.port };
        }.bind(this));
        this.ring.swap(node.name, 'slave'+node.name);
    }.bind(this));

    client.on('serverFail', function (node) {
        this.ring.swap(node.name, 'slave'+node.name);
    }.bind(this));

    client.on('serverRelive', function (node) {
        console.log('server relive', node);
        this.serverNames.push(node.name);
        var slave = 'slave' + node.name;
        delete this.servers[slave];
        delete this.pool[slave];
        this.ring.swap(slave, node.name);
    }.bind(this));
    
    return this.pool[serverName] = client;
}

Pool.prototype.getSlave = function (master, cb) {
    var self = this, 
        next = this.nextSlave(this.serverNames), 
        nextSlave = 'slave' + master,
        s = self.servers[next];
    self.servers[nextSlave] = self.servers[nextSlave] || { name: nextSlave, host: s.host, port: s.port };
    var slave = this.pool[nextSlave] || this.addClient(nextSlave, true);
    
    slave.pull(function (err) {
        if (err) return setImmediate(function () { self.getSlave(master, cb); });
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
        first = (first+1) % servers.length;
        return servers[first]; 
    }
})();
