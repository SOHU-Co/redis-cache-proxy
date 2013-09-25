var hiredis = require('hiredis');

var reader = new hiredis.Reader();
reader.feed('*1\r\n$3\r\nget\r\n');
console.log(reader.get());
console.log(reader.get());
reader.feed('*1\r\n$3\r\nget\r\n');

console.log(reader.get());
