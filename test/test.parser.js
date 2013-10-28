var Parser = require('../lib/parser');

var parser = new Parser(),
    raw_1, raw_2, raw_3;

describe('Parser', function () {
    before(function () {
        raw_1 = '*1\r\n$4\r\nping\r\n';
        raw_2 = '*2\r\n$3\r\nget';
        raw_3 = '\r\n$3\r\nkey\r\n';
    });

    describe('#parse', function () {
        it('should return right data', function (done) {
            var count = 0;
            function reply(data) {
                count++;
                if (count === 1) data.should.eql(['ping']);
                if (count === 2) data.should.eql(['get', 'key']);
                if (count === 2) done();
            }
            parser.parse(raw_1, reply);
            parser.parse(raw_2, reply);
            parser.parse(raw_3, reply);
        });  
    });   
});
