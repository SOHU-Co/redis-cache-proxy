function Response(writer) {
    this.writer = writer;
};

Response.prototype._bulk = function (data) {
    if (!data) return '$-1\r\n';
    var buf = new Buffer(data.toString());
    return '$' + buf.length + '\r\n' + buf + '\r\n';
};

Response.prototype.write = function (data, encoded) {
    //if (!this.writer.writable) return console.log('socket not writable'); 
    if (encoded) return this.writer.write(data);

    if (Array.isArray(data) && data.length === 1) data = data[0];

    var writer = this.writer;

    if (Array.isArray(data)) {
        writer.write('*' + data.length + '\r\n');
        data.forEach(function (v) {
            writer.write(this._bulk(v));
        }.bind(this));
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
