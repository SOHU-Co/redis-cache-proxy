'use strict'

var HashRing = require('hashring'),
    Client = require('../lib/client'),
    config = require('../config/servers.json');

var Pool = module.exports = function () {
    // If servers set as args, we use it
    var servers = Object.keys(config); 
    this.ring = new HashRing(servers);
    // Redis client poll
    this.pool = {};
    this.servers = {};
    this.parseServer(servers);
}

Pool.prototype.parseServer = function (servers) {
    servers.forEach(function (s) {
        var x = (config[s]).split(':');
        this.servers[s] = new Server(x[0], x[1]);
    }.bind(this));
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

function Server(host, port) {
    this.host = host;
    this.port = port;
}

Server.prototype.toString = function () {
    return this.host + ':' + this.port;
}
