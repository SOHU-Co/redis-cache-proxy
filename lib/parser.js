var events = require('events'),
    util = require('util'),
    hiredis = require("hiredis");

function Parser(options) {
    this.name = exports.name;
    this.options = options || {};
    this.reader = new hiredis.Reader();
}
util.inherits(Parser, events.EventEmitter);

Parser.prototype.parse = function (data) {
    var reply;
    this.reader.feed(data);
    while (true) {
        try {
            reply = this.reader.get();
        } catch (err) {
            this.emit("error", err, data);
            break;
        }
        if (reply === undefined) {
            this.emit('done', data);
            break;
        }
        
        this.emit("reply", reply);
    }
}

module.exports = Parser;
