'use strict';

var events = require('events'),
    util = require('util'),
    hiredis = require("hiredis");

function Parser(options) {
    this.name = exports.name;
    this.options = options || {};
    this.reader = new hiredis.Reader();
}
util.inherits(Parser, events.EventEmitter);

Parser.prototype.reset = function () {
    this.reader = new hiredis.Reader();
}

Parser.prototype.parse = function (data, replyFn, done) {
    var reply;
    if (data) this.reader.feed(data);

    while (true) {
        try {
            reply = this.reader.get();
        } catch (err) {
            this.emit("error", err, data);
            break;
        }
        if (reply === undefined) {
            //this.emit('done', data);
            done && done(data);
            break;
        }        

        replyFn && replyFn(reply); 
        //this.emit("reply", reply);
    }
}

module.exports = Parser;
