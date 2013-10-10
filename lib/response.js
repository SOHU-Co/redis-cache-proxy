function Response(writer) {
    this.writer = writer;
};

Response.prototype._bulk = function (data) {
    if (!data) return '$-1\r\n';
    if(typeof data !== 'string') {
        data = String(data);
    }
    return "$" + Buffer.byteLength(data) + "\r\n" + data + "\r\n";
};
Response.prototype.write = function (data, encoded) {
    //if (!this.writer.writable) return console.log('socket not writable'); 
    if (encoded) return this.writer.write(data);

    var writer = this.writer;
    if (Array.isArray(data)) {
        var str = "*" + data.length + "\r\n";
        for (var i=0, l=data.length; i<l; i++)
            str += this._bulk(data[i]);
        writer.write(str);
    } else {
        switch (typeof data) {
            case 'number':
                return writer.write(':' + data + '\r\n');
            case 'boolean':
                return writer.write(':' + (data ? '1' : '0') + '\r\n');
            default:
                return writer.write(this._bulk(data));
        }
    }
};

Response.prototype.error = function (error) {
    this.writer.write('-' + error + '\r\n');
}

Response.prototype.singleLine = function (line) {
    this.writer.write('+' + line + '\r\n');
}

module.exports = Response;
