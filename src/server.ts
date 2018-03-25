import * as restify from "restify"
import * as corsMiddleware from 'restify-cors-middleware'
import * as cryptoRandomString from 'crypto-random-string'
import * as restifyJwt from 'restify-jwt'
const privateKey = cryptoRandomString(32)

//config
export const server = restify.createServer({
    name: 'LiveBand',
    version: '1.0.0'
});

const cors = corsMiddleware({
    origins: ['*'],
    allowHeaders: ['Authorization'],
    exposeHeaders: ['API-Token-Expiry']
})

// parsing settings
server.use(restify.plugins.acceptParser(server.acceptable));
server.use(restify.plugins.queryParser());
server.use(restify.plugins.bodyParser());
/*
server.use(restifyJwt({ secret: privateKey }).unless(
    { path: ['/account/login'], method: ['POST'] },
    { path: ['/announce'], method: ['GET'] },
    { path: ['/event'], method: ['GET'] }
))
*/
//restify.CORS.ALLOW_HEADERS.push('authorization');
server.pre(cors.preflight)
server.use(cors.actual)

// When behind Nginx comment belows
server.use(restify.plugins.throttle({
  burst: 100,
  rate: 50,
  ip: true
}));

server.use(restify.plugins.gzipResponse())

server.listen(51234, function() {
    console.log('\t%s listening at %s', server.name, server.url);
})

module.exports = {server,privateKey}