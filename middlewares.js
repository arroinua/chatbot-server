const debug = require('debug')('booking');
const Context = require('./models').Context;
const request = require('request');
const conf = require('./config');
const utils = require('./utils');

module.exports = { 
	validateMessage,
	getContext, 
	updateContext, 
	normalizeMessageParams, 
	getSessionStatus, 
	getBotInfo 
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
			text: params.content
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

		request({
			url: ('https://'+conf.server_domain),
			method: "POST",
			auth: {
				user: conf.client_login,
				pass: conf.client_password,
				sendImmediately: true
			},
			body: {
				method: "getSession",
				params: {
					sessionid: resultParams.context.sessionid
				}
			},
			json: true
		}, function(err, response, body) {
			debug('getSessionParams response: ', err, body);
			if(err) return reject(err);
			resultParams.context.session_status = body.result.status;
			resolve(resultParams);
		});

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
			
		debug('getBotInfo params: ', resultParams);
		if(resultParams.context.bot_id && resultParams.context.bot_name) return resolve(resultParams);

		getProfile({ user_id: conf.client_login })
		.then(result => {
			debug('getBotInfo result: ', result);
			resultParams.context.bot_id = result.userid;
			resultParams.context.bot_name = result.name;
			resolve(resultParams);
		})
		.catch(reject);
        
    });
}

function getProfile(params) {

	return new Promise((resolve, reject) => {
		
		debug('getProfile: ', params, conf);

		request({
			url: ('https://'+conf.server_domain),
			method: "POST",
			auth: {
				user: conf.client_login,
				pass: conf.client_password,
				sendImmediately: true
			},
			body: {
				method: "getProfile"
				// method: "getUserInfo",
				// params: {
				// 	userid: params.user_id
				// },
			},
			json: true
		}, function(err, response, body) {
			debug('getProfile response: ', err, body);
			if(err) return reject(err);
			resolve(body.result);
		});        
        
    });
}