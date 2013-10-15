'use strict';

var discache = require('./lib/discache'),
    NODE_ENV = process.env.NODE_ENV || 'development',
    config = require('./config/config.json')[NODE_ENV];

discache.createServer(config);
