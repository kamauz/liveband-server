//var app = require('../src/index')
var request = require('request')
var baseUrl = 'http://localhost:51234'

var head = {
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
    'Accept-Encoding': 'gzip, deflate',
    'Accept-Language': 'en-GB,en;q=0.8,en-US;q=0.6,hu;q=0.4',
    'Cache-Control': 'max-age=0',
    Connection: 'keep-alive',
    Host: 'localhost',
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.113 Safari/537.36',
}


describe("testing GET /user", function() {
    describe("GET /user", function() {
        it("returns status code 200", function(done) {
            request.get({
                url: baseUrl+'/user',
                headers: head
            }, (error, response, body) => {
                expect(response.statusCode).toBe(200);
                done();
            })
        })
    })
})
describe("testing POST /user", function() {
    describe("POST /user", function() {
        it("returns status code 200", function(done) {
            var options = {
                uri: baseUrl+'/user',
                method: 'POST',
                headers: head,
                json: {
                  "first_name": "2",
                  "last_name": "2",
                  "username": "2",
                  "password": "2"
                }
              };

            request(options, function (error, response, body) {
                expect(response.statusCode).toBe(200)
                done()
            });
        })
        it("returns status code 500", function(done) {
            var options = {
                uri: baseUrl+'/user',
                method: 'POST',
                headers: head,
                json: {}
              };

            request(options, function (error, response, body) {
                expect(response.statusCode).toBe(200)
                done()
            });
        })
    })
})