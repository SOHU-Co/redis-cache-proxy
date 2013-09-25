'use stirct';

var net = require('net'),
    Parser = require('./parser');

function Client() {
    this.parser = new Parser();
    this.rsps = [];
    this.connect();
}

Client.prototype.connect = function () {
    this.stream = this.createConnection();
    this.parser.on('reply', function (data) {
        this.writer = this.rsps.shift();
    }.bind(this));

    this.parser.on('done', function (data) {
        this.writer.write(data, true);
    }.bind(this));

    this.parser.on('error', function () {
        console.log(arguments);
    });
}

Client.prototype.write = function (data) {
    this.stream.write(data);
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
        this.parser.parse(data); 
    }.bind(this));

    return s; 
}

module.exports = Client;
