'use strict';
var proxy = require('redis-cache-proxy'),
    cluster = require('cluster'),
    cpus = require('os').cpus().length,
    NODE_ENV = process.env.NODE_ENV || 'development',
    config = require('../config/config.json')[NODE_ENV];

if (cluster.isMaster) {
    for (var i=0; i<cpus; i++)
        cluster.fork();
} else {
    proxy.createServer(config.servers).listen(config.port, function () {
        console.log('Proxy listening port', config.port);
    });
}
