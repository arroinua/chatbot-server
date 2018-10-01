const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const http = require('http');
const https = require('https');
const morgan = require('morgan')
const debug = require('debug')('booking');
const path = require('path');
const logger = require('./logger');
const mongoose = require('mongoose');
const websocketModule = require('./websocket');
const conf = require('./config');

mongoose.connect(conf.db, { useNewUrlParser: true })
.then(() => { debug('mongoose connected') })
.catch(err => { debug('mongoose connect error: ', err) });
websocketModule.connect(conf);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(function(req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-type, Content-length, Authorization');
    next();
});

app.use(express.static(path.resolve('app')));

logger.stream = {
    write: function(message, encoding){
        logger.info(message);
    }
};

app.use(morgan("combined", { stream: logger.stream }));
app.use('/chatbot', require('./routes'));

//===============Error handlers================

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('not found');
    err.status = 404;
    next(err);
});

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || err.statusCode || 500);
        res.json({
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || err.statusCode || 500);
    res.json({
        error: { name: "ERROR", message: "We have encoutered some technical issues. Our team is already notified. We will contact you shortly." }
    });
  
});

//===============Start Server================

http.createServer(app).listen(conf.port);
console.log('App is listening at http port %s', conf.port);

// if(config.ssl) {
//     options = {
//         key: fs.readFileSync(config.ssl.key),
//         cert: fs.readFileSync(config.ssl.cert)
//         // requestCert: true,
//         // rejectUnauthorized: true
//     };

//     https.createServer(options, app).listen(config.port+1);
//     console.log('App is listening at https port %s', config.port+1);
// }
