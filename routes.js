const express = require('express');
const router = express.Router();
const controllers = require('./controllers');
const debug = require('debug')('booking');
const middlewares = require('./middlewares');
const Context = require('./models').Context;
const services = require('./services')

module.exports = router;

router.post('/', function(req, res, next) {
    const message = req.body;
    middlewares.normalizeMessageParams(message)
    .then(middlewares.getSessionStatus)
    .then(middlewares.validateMessage)
    .then(middlewares.getContext)
    .then(middlewares.getBotInfo)
    .then(function(params) {
        services.processMessage(params, function(err, result) {
            debug('processMessage result: ', err, result);
            if(err) return next(err);
            res.json({
                success: true,
                result: {
                    message: result.output.text.join('. ')
                } 
            });
        });
    })
});
