'use strict';

var _mbulk = function (data) {
    var str = "*" + data.length + "\r\n";
    for (var i=0, l=data.length; i<l; i++)
        str += _bulk(data[i]);
    return str;
};

var _bulk = function (item) {
    if (item === null) return '$-1\r\n';
    
    if (typeof item !== 'string') item = String(item);
    return "$" + Buffer.byteLength(item) + "\r\n" + item + "\r\n";
}

var encode = function (data) {
    // multi bulk: ['get','key']
    if (Array.isArray(data))
        return _mbulk(data); 
    // stats: ok
    else if (data === 'OK')
        return '+OK\r\n';
    // number: 1
    else if (typeof data === 'number')
        return ':' + data + '\r\n';
    // error: Error
    else if (data instanceof Error)
        return '-' + data.message + '\r\n';
    // bulk: 'version: 2.6.1'
    else
        return _bulk(data);
};

module.exports = encode;
