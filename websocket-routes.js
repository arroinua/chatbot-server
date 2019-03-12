const debug = require('debug')('booking');
const services = require('./services')
const middlewares = require('./middlewares')
const websocketModule = require('./websocket');
const logger = require('./logger');
const conf = require('./config');

module.exports = { router };

function router(str, conn) {
	debug('websocketRouter str: ', str);
	
	const message = JSON.parse(str);
	
	debug('websocketRouter: ', message)

	if(!message.method || message.method !== 'message') return;
	if(message.params.orig === conf.client_login) return;

	middlewares.normalizeMessageParams(message)
    .then(middlewares.getContext)
    .then(middlewares.getSessionStatus)
    .then(middlewares.getBotInfo)
	.then(middlewares.validateMessage)
    // .then(getUserName)
    .then(function(params) {
		 middlewares.processMessage(params, function(err, result) {
		 	debug('websocketRouter result:', err, result);
		 	if(err) return logger.error(err);

		 	let responseMessage = {
		 		method: "sendMessage", 
		 		params: { 
		 			sessionid: result.context.sessionid, 
		 			content: result.output.text.join('. ')
		 		}
		 	};

		 	debug('websocketRouter responseMessage: ', responseMessage);

		 	if(result.output.text && result.output.text.length) conn.sendText(JSON.stringify(responseMessage));
		 })
    })
    .catch(err => {
    	debug('router error: ', err);
    	if(err) logger.error(err);
    });
		
}