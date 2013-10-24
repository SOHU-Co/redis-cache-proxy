'use strict'

var HashRing = require('hashring'),
    Client = require('../lib/client');

var Pool = module.exports = function (servers) {
    this.ring = new HashRing(Object.keys(servers), 'md5', 10000);
    this.pool = {};
    this.servers = {};
    this.parseServer(servers);
    this.nextSlave = roundRobin(Object.keys(servers));
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
    client.pull(function (err) {
        if (err) { 
            self.getSlave(function (err, slave) {
                slave.pull(function (err) {
                    if(err) return cb(err, client);
                    return cb(null, slave); 
                });
            });
            return;
        }
        
        cb(null, client); 
    });
}

Pool.prototype.addClient = function (serverName, slave) {
    var server = this.servers[serverName];
    var client = new Client(server, slave);
    if (slave) return this.pool['slave'+serverName] = client;

    client.on('serverFail', function (node) {
        var nodeName = 'slave' + node.name; 
        var alive = { name: nodeName, host: '10.2.24.41', port: 6382 };
        this.servers[nodeName] = alive;
        this.ring.swap(node.name, 'slave'+node.name);
    }.bind(this));

    client.on('serverRelive', function (node) {
        delete this.servers['slave'+node.name];
        this.ring.swap('slave'+node.name, node.name);
    }.bind(this));

    return this.pool[serverName] = client;
}

Pool.prototype.getSlave = function (cb) {
    var self = this, nextName = this.nextSlave(), nextSlaveName = 'slave' + nextName;
    var slave = this.pool[nextSlaveName] || this.addClient(nextName, true);

    slave.pull(function (err) {
        if (err) return self.getSlave(cb);
        return cb(null, slave);
    });
}

function roundRobin (servers) {
    var self = this, first = 0;
    return function () {
        first = (first+1) % servers.length;
        return servers[first]; 
    }
}
