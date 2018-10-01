const ws = require('nodejs-websocket');
const debug = require('debug')('booking');
const websocketRouter = require('./websocket-routes').router;
let websocketTry = 1;
let pingInterval = null;
let pingIntervalValue = (5*60*1000);
let conn = null;

module.exports = { connect: connect, sendText: sendText };

function connect(params) {
    conn = ws.connect('wss://'+params.server_domain, {
        extraHeaders: {     
            Authorization: 'Basic ' + new Buffer(params.client_login+':'+params.client_password).toString('base64')
        },
        protocols: ['json.api.smile-soft.com']
    })

    conn.on('connect',function(){
        debug('Websocket connected: ');
        websocketTry = 1;
        clearInterval(pingInterval);
        pingInterval = setInterval(function() {
            sendPing(conn);
        }, pingIntervalValue);
        // conn.sendText(JSON.stringify({
        //     method: "getUserInfo", params: { userid: "ringotel101" }, id: 1
        // }));
    })

    conn.on('error',function(err){
        debug('Websocket error: ', err);
     
    })

    conn.on('close',function(code, reason){
        debug('Websocket close: ', code, reason);
        const time = generateInterval(websocketTry);
        setTimeout(function(){
            websocketTry++;
            connect(params);
        }.bind(this), time);
    })

    conn.on('text', function(str) {
        websocketRouter(str, conn);
    });

    conn.on('pong', function(data) {
            debug('pong', data  );
    });

}

function sendText(params) {
    debug('sendText: ', params);
    conn.sendText(JSON.stringify(params));
}

function sendPing(conn) {
    debug('sendPing');
    conn.sendPing();
}

function generateInterval (k) {
    var maxInterval = (Math.pow(2, k) - 1) * 1000;
  
    if (maxInterval > 30*1000) {
        maxInterval = 30*1000; // If the generated interval is more than 30 seconds, truncate it down to 30 seconds.
    }
  
    // generate the interval to a random number between 0 and the maxInterval determined from above
    return Math.random() * maxInterval;
}