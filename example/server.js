'use strict';

var proxy = require('redis-cache-proxy'),
    NODE_ENV = process.env.NODE_ENV || 'development',
    config = require('../config/config.json')[NODE_ENV];

proxy.createServer(config).listen(config.port, function () {
    console.log('Proxy listening port', config.port);
});
