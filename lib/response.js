function Response(writer, client) {
    this.writer = writer;
    this.commandQueue = [];
    this.client = client;
};

Response.prototype._mbulk = function (data) {
    var str = "*" + data.length + "\r\n";
    for (var i=0, l=data.length; i<l; i++)
        str += this._bulk(data[i]);
    this.writer.write(str); 
};

Response.prototype._bulk = function (item) {
    if (!item) return '$-1\r\n';
    
    if (typeof item !== 'string') item = String(item);
    return "$" + Buffer.byteLength(item) + "\r\n" + item + "\r\n";
}

Response.prototype._write = function (data) {
    // multi bulk: ['get','key']
    if (Array.isArray(data))
        this._mbulk(data); 
    // stats: ok
    else if (data === 'OK')
        this.writer.write('+OK\r\n');
    // number: 1
    else if (typeof data === 'number')
        this.writer.write(':' + data + '\r\n');
    // error: Error
    else if (data instanceof Error)
        this.writer.write('-' + data.message + '\r\n');
    // bulk: 'version: 2.6.1'
    else
        this.writer.write(this._bulk(data));
};

Response.prototype.write = function (data, clientId) {
    if (this.client) return this.push(data, clientId);
    this._write(data);
}

Response.prototype.push = function (data, clientId) {
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
