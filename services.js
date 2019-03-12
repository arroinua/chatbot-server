const debug = require('debug')('booking');
const conf = require('./config')
const request = require('request');
const each = require('async/each');

module.exports = { fetchApi, sendMessageToUsers, sendMessage };

// // Start conversation with empty message.
// service.message({
//   workspace_id: workspace_id
// }, processResponse);

function fetchApi(method, params) {
    debug('fetchApi: ', method, params);
    return new Promise((resolve, reject) => {
        
        let reqParams = {
            url: ('https://'+conf.server_domain),
            method: "POST",
            auth: {
                user: conf.client_login,
                pass: conf.client_password,
                sendImmediately: true
            },
            body: {
                method: method
            },
            json: true
        };

        if(params) reqParams.body.params = params;

        request(reqParams, function(err, response, body) {
            if(err) return reject(err);
            debug('fetchApi result: ', method, body.result);
            resolve(body.result);
        });

    });
}

function sendMessageToUsers(users, message) {
    debug('sendMessageToUsers: ', users, message);
    return new Promise((resolve, reject) => {
        let userIds = [];
        let activeSessions = [];
        let sessionsToCreate = [];

        fetchApi('getExtensions')
        .then(result => {
            userIds = result.reduce((ids, item) => {
                if(users.indexOf(item.name) !== -1) ids.push(item.userid);
                return ids;
            }, []);
            debug('notifyUsers userIds: ', userIds);
            return fetchApi('getSessions');
            
        })
        .then(result => {
            debug('getSessions: ', result);
            result.forEach(item => {
                if(item.parties.length === 2) {
                    let userId = item.parties.splice(item.parties.indexOf(conf.client_login))[0];
                    activeSessions = (userIds.indexOf(userId) !== -1) ? activeSessions.concat([item.id]) : activeSessions;
                    userIds = userIds.splice(userId, 1);
                }
            });
            resolve()
        })
        .then(result => {
            debug('sendMessageToUsers userIds', userIds);
            debug('sendMessageToUsers activeSessions', activeSessions);
            if(userIds.length) {
                each(userIds, (id, cb) => {
                    createSession({
                        parties: [id]
                    })
                    .then(result => {
                        activeSessions = activeSessions.concat([result.id]);
                        debug('createSession result: ', result.id, activeSessions)

                        cb();
                    })
                    .catch(err => {
                        debug('createSession err', err);
                        cb(err)
                    })

                }, err => {
                    // debug('createSessions error: ', err);
                    if(err) return reject(err);
                    resolve();
                });
            } else {
                resolve();
            }
        })
        .then(result => {
            debug('send message to activeSessions: ', activeSessions);
            each(activeSessions, (id, cb) => {
                sendMessage(id, message)
                .then(() => cb())
                .catch(cb);
            }, err => {
                if(err) return reject(err);
                resolve();
            });
        })
        .catch(reject)
    });
}

function createSession(params) {
    return fetchApi('createSession', {
        parties: params.parties,
        status: 0
    });
}

function sendMessage(sessionid, message) {
    return fetchApi('sendMessage', {
        sessionid: sessionid,
        type: 1,
        content: message
    });
}