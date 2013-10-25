'use strict'

var encoder = require('./encoder');

function Response(writer) {
    this.writer = writer;
    this.commandQueue = [];
};

Response.prototype._write = function (data) {
    this.writer.write(encoder(data));    
};

Response.prototype.write = function (data, clientId) {
    var index = this.commandQueue.indexOf(clientId);
    if (~index) this.commandQueue[index] = new Command(data);
    this.writeToClient();
}

Response.prototype.error = function (error, clientId) {
    this.write(new Error(error), clientId);
}

Response.prototype.available = function () {
    return this.writer.writable;
}

Response.prototype.writeToClient = function () {
    while (this.commandQueue[0] instanceof Command)
            this._write(this.commandQueue.shift().command);
    /* 
    if (this.commandQueue[0] instanceof Command)
        this._write(this.commandQueue.shift().command);
    
    if (this.commandQueue[0] instanceof Command)
        setImmediate(function () { this._write(this.commandQueue.shift().command); }.bind(this));
   
    */
}

function Command(command) {
    this.command = command;
}

module.exports = Response;
