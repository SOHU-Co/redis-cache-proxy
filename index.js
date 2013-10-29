'use strict';
var net = require('net'),
    Pool = require('./lib/pool'),
    Parser = require('./lib/parser'),
    Response = require('./lib/response');

exports.createServer = function (config) {
    if (!config.servers || !Object.keys(config.servers).length) 
        throw new Error('Servers can not be blank!');

    var pool = new Pool(config.servers);
    var server = net.createServer(function (socket) {
        console.log('client connected')
        var parser = new Parser();
        var response = new Response(socket);
        function reply(reply) {
            pool.select(reply[1], function (err, client) {
                response.commandQueue.push(client.id);
                var cmd = reply[0];

                if (cmd.toUpperCase() === 'INFO')
                    return response.write('redis_version:' + config.redisVersion, client.id);

                if (!~SUPPORTED_COMMANDS.indexOf(cmd.toUpperCase()))
                    return response.error("ERR unsupported command '" + cmd + "'", client.id);

                if (err) 
                    return response.error('ERR Connection refused', client.id);

                client.write(reply, response);
            });
        }

        parser.on('error', function (err, buf) {});

        socket.on('data', function (raw) {
            setImmediate(function () {
                parser.parse(raw, reply);
            });
        }); 

        socket.on('end', function () {
        });

        socket.on('error', function () {
        });
    });

    return server;
}

var SUPPORTED_COMMANDS = exports.commands = ['DEL','DUMP','EXISTS','EXPIRE','EXPIREAT','PERSIST','PEXPIRE','PEXPIREAT','PTTL','RESTORE','TTL','TYPE','APPEND','BITCOUNT','DECR','DECRBY','GET','GETBIT','GETRANGE','GETSET','INCR','INCRBY','INCRBYFLOAT','MGET','PSETEX','SET','SETBIT','SETEX','SETNX','SETRANGE','STRLEN','HDEL','HEXISTS','HGET','HGETALL','HINCRBY','HINCRBYFLOAT','HKEYS','HLEN','HMGET','HMSET','HSET','HSETNX','HVALS','LINDEX','LINSERT','LLEN','LPOP','LPUSH','LPUSHX','LRANGE','LREM','LSET','LTRIM','RPOP','RPOPLPUSH','RPUSH','RPUSHX','SADD','SCARD','SDIFF','SDIFFSTORE','SINTER','SINTERSTORE','SISMEMBER','SMEMBERS','SMOVE','SPOP','SRANDMEMBER','SREM','SUNION','SUNIONSTORE','ZADD','ZCARD','ZCOUNT','ZINCRBY','ZINTERSTORE','ZRANGE','ZRANGEBYSCORE','ZRANK','ZREM','ZREMRANGEBYRANK','ZREMRANGEBYSCORE','ZREVRANGE','ZREVRANGEBYSCORE','ZREVRANK','ZSCORE','ZUNIONSTORE','EVAL','EVALSHA'];
