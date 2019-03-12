const debug = require('debug')('booking');
const Context = require('./models').Context;
const conf = require('./config');
const utils = require('./utils');
const fetchApi = require('./services').fetchApi;
const bookings = require('./bookings');
const AssistantV1 = require('watson-developer-cloud/assistant/v1');
const config = require('./config')
const aiService = new AssistantV1({
  username: config.assistant.username,
  password: config.assistant.password,
  version: config.assistant.version
});
const workspace_id = config.assistant.workspace_id;

module.exports = { 
	validateMessage,
	getContext, 
	updateContext, 
	normalizeMessageParams, 
	getSessionStatus, 
	getBotInfo,
	processMessage,
	sendToAssistant,
	dispatchAction
};

function normalizeMessageParams(message) {
	let params = message.params;
	return new Promise((resolve, reject) => {
		debug('normalizeParams: ', params);
		const resultParams = {
			context: {
				sessionid: params.sessionid,
				user_id: params.orig
			},
			text: params.content.trim()
		};

		if(params.from) resultParams.context.user_name = params.from;

		debug('normalizeParams resultParams: ', resultParams);

		resolve(resultParams);

	});
}

function getSessionStatus(params) {
	const resultParams = Object.assign({}, params);
	
	return new Promise((resolve, reject) => {
		
		if(resultParams.context.session_status !== undefined) resolve(resultParams);

		fetchApi('getSession', {
			sessionid: resultParams.context.sessionid
		})
		.then(result => {
			resultParams.context.session_status = result.status;
			resolve(resultParams);
		})
		.catch(reject);
	});
}

function validateMessage(params) {
	return new Promise((resolve, reject) => {
		
		debug('validateMessage: ', params, utils.isMentioned(params.text, params.context.bot_name));

		if(params.context.session_status === 2 && !utils.isMentioned(params.text, params.context.bot_name)) {
			return reject();
		}

		resolve(params);
		
	});
}

function getContext(params) {
	const resultParams = Object.assign({}, params);

	return new Promise((resolve, reject) => {

		Context.findOne({
			sessionid: resultParams.context.sessionid
		})
		.then(result => {
			resultParams.context = result || resultParams.context;
	    	if(result && !result.has_conversations) resultParams.context.has_conversations = true;

			debug('getContext: ', resultParams);
			resolve(resultParams);
		})
		.catch(reject);

	});

}

function updateContext(params) {
	debug('updateContext: ', params);
	return new Promise((resolve, reject) => {
		Context.findOneAndUpdate({ user_id: params.context.user_id }, params.context, { upsert: true }, function(err, result) {
			if(err) return reject(err);
			resolve(params);
		})
	});
}

function getBotInfo(params) {
	const resultParams = Object.assign({}, params);

	return new Promise((resolve, reject) => {
			
		debug('getBotInfo fetch params: ', resultParams);
		if(resultParams.context.bot_id && resultParams.context.bot_name) return resolve(resultParams);

		fetchApi('getProfile', { user_id: conf.client_login })
		.then(result => {
			debug('getBotInfo fetch result: ', result);
			resultParams.context.bot_id = result.userid;
			resultParams.context.bot_name = result.name;
			resolve(resultParams);
		})
		.catch(reject);
        
    });
}

function processMessage(message, callback) {
    debug('processMessage:', message);

    sendToAssistant(message)
    .then(dispatchAction)
    .then(params => {
        debug('processResponse result: ', params);
        if(params.context && params.context.skip_user_input) { 
            processMessage(params, callback) 
        } else {
            return updateContext(params)
            .then(result => callback(null, result))
            .catch(callback);
        }
    })
    .catch(callback)
}

function sendToAssistant(message) {
    return new Promise((resolve, reject) => {
        debug('sendToAssistant: ', message);
        const params = {
            input: { text: message.text },
            workspace_id: workspace_id
        };
        if(message.context) params.context = message.context;
        
        aiService.message(params, function(err, response) {
            if(err) return reject(err);
            resolve(response)
        })
    });
}

function dispatchAction(params) {
    debug('responseFromAssistant: ', params)
    if(!params.actions || !params.actions.length) return Promise.resolve(params);
    return bookings.dispatch(params.actions[0].name, params);

}
