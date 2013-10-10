function Response(writer) {
    this.writer = writer;
};

Response.prototype._mbulk = function (data) {
    var str = "*" + data.length + "\r\n", item;
    for (var i=0, l=data.length; i<l; i++)
        str += this._bulk(data[i]);
    this.writer.write(str); 
};

Response.prototype._bulk = function (item) {
    if (!item) return '$-1\r\n';
    
    if (typeof item !== 'string') item = String(item);
    return "$" + Buffer.byteLength(item) + "\r\n" + item + "\r\n";
}

Response.prototype.write = function (data) {
    if (Array.isArray(data))
        this._mbulk(data); 
    else if (typeof data === 'string')
        this.writer.write('+' + data + '\r\n');
    else if (typeof data === 'number')
        this.writer.write(':' + data + '\r\n');
    else if (data instanceof Error)
        this.writer.write('-' + data.message + '\r\n');
    else
        this.writer.write(this._bulk(data));
};

module.exports = Response;
