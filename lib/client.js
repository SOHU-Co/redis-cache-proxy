'use stirct';

var net = require('net'),
    _ = require('underscore'),
    Parser = require('./parser');

function Client() {
    this.parser = new Parser();
    this.rsps = [];
    this.connect();
}

Client.prototype.connect = function () {
    this.stream = this.createConnection();
    this.parser.on('error', function (err, buf) {
        this.reset();
        //console.log('err parsed', buf.toString('utf-8'));
    });
    //this.stream.write(['ping']);
}

Client.prototype.write = function (data) {
    this.stream.write(data);
}

Client.prototype.reply = function (reply) {
    //console.log(_.map(this.rsps, function (r) { return r.writer.id }));
    this.writer = this.rsps.shift();
    this.writer.write(reply); 
}

Client.prototype.done = function (data) {
    //console.log('client socket id', this.writer.writer.id);
    //this.writer.write(data, true);
}

Client.prototype.ready = function (pong) {
    if (pong === 'PONG') {
        this.isReady = true;
        console.log('reday')
    }
}

Client.prototype.eol = function (line) {
    return /\r\n$/.test(line.toString('utf-8'));
}

Client.prototype.createConnection = function (port, host) {
    var s = net.createConnection(port || 6379, host);
    var _write = s.write;
    s.write = function(args) {
        var i;
        _write.call(s, "*" + args.length + "\r\n");
        for (i = 0; i < args.length; i++) {
            var arg = args[i];
            _write.call(s, "$" + arg.length + "\r\n" + arg + "\r\n");
        }
    }

    s.on("data", function(data) {
        //console.log('server respond++++++++++++++++++\n', data.toString('utf-8'));
        this.parser.parse(data, this.reply.bind(this), this.done.bind(this)); 
    }.bind(this));

    s.on('error', function () {
        console.log('Client.js', arguments);
    });

    return s; 
}

module.exports = Client;
