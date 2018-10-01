const debug = require('debug')('booking');
const bookings = require('./bookings');
const middlewares = require('./middlewares');
const AssistantV1 = require('watson-developer-cloud/assistant/v1');
const config = require('./config')
const service = new AssistantV1({
  username: config.assistant.username,
  password: config.assistant.password,
  version: config.assistant.version
});
const workspace_id = config.assistant.workspace_id;

module.exports = { processMessage };

// // Start conversation with empty message.
// service.message({
//   workspace_id: workspace_id
// }, processResponse);

function processMessage(message, callback) {
    debug('processMessage:', message);

    sendToAssistant(message)
    .then(dispatchAction)
    .then(params => {
        debug('processResponse result: ', params);
        if(params.context && params.context.skip_user_input) { 
            processMessage(params, callback) 
        } else {
            return middlewares.updateContext(params)
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
        
        service.message(params, function(err, response) {
            if(err) return reject(err);
            resolve(response)
        })
    });
}

// Process the service response.
// function processResponse(response) {
 
//     return new Promise((resolve, reject) => {

//         debug('processResponse: ', response);
//         let intent, text, action = null, context = response.context;

//       // If an intent was detected, log it out to the console.
//         if (response.intents.length > 0) {
//             debug('Detected intent: #', response.intents[0].intent);
//             intent = response.intents[0].intent;
//         }

//         if (response.actions && response.actions.length > 0) {
//             debug('Detected actions: #', response.actions[0]);
//             action = response.actions[0];
//         }

//       // Display the output from dialog, if any.
//         if (response.output.text.length != 0) {
//             debug('Detected outputs: ', response.output.text[0]);
//             text = response.output.text[0];
//         }

//         resolve(response);
//         // resolve({ intent, text, context, action });

//     });

// }

function dispatchAction(params) {
    debug('responseFromAssistant: ', params)
    if(!params.actions || !params.actions.length) return Promise.resolve(params);
    return bookings.dispatch(params.actions[0].name, params);

}