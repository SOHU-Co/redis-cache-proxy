'use strict'

var HashRing = require('hashring'),
    _ = require('underscore'),
    Client = require('../lib/client');

var Pool = module.exports = function (servers) {
    this.ring = new HashRing(servers);
    // Redis client poll
    this.pool = {};
    this.servers = {};
    this.parseServer(servers);
}

Pool.prototype.parseServer = function (servers) {
    for (var serverName in servers) {
        var x = (servers[serverName]).split(':');
        this.servers[serverName] = new Server(x[0], x[1]);
    }
}

Pool.prototype.select = function (key, cb) {
    var serverName = this.ring.get(key);
    var conn = this.pool[serverName] || this.addClient(serverName);
    cb(null, conn);
}

Pool.prototype.addClient = function (serverName) {
    var server = this.servers[serverName];
    return this.pool[serverName] = new Client(server.port, server.host);
}

Pool.prototype.stats = function () {
    return _.values(this.pool)
        .reduce(function (out, client) {
            out.push(_.pick(client, 'host','port','requests'));
            return out;
        }, []);     
}

function Server(host, port) {
    this.host = host;
    this.port = port;
}

Server.prototype.toString = function () {
    return this.host + ':' + this.port;
}
