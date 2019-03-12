const debug = require('debug')('booking');
const fetchApi = require('./services').fetchApi;
const sendMessageToUsers = require('./services').sendMessageToUsers;
const utils = require('./utils');
const Booking = require('./models').Booking;
const actions = {
	"GetActiveBookingByIndex": getActiveBookingByIndex,
	"BookTimeslot": createBookings,
	"GetActiveUserBookings": getActiveUserBookings,
	"CheckCollisions": checkCollisions,
	"GetFreeSlots": getFreeSlots,
	"CancelBooking": cancelBooking,
	"NotifyUsers": notifyUsers
};

module.exports = {dispatch};

function dispatch(action, params) {
	debug('dispatch ', action, params, params.actions[0].parameters);
	if(!actions[action]) return Promise.reject(params);
	return actions[action](params);
}

function getActiveBookingByIndex(params) {
	const resultParams = Object.assign({}, params);
	const index = parseInt(params.context.booking_index, 10) - 1;

	debug('getBookingByIndex: ', resultParams, index);

	return new Promise((resolve, reject) => {
		// Booking.find({
		// 	begin: { $gte: Date.now() },
		// 	user_id: params.context.user_id,
		// 	canceled: false
		// })
		getActiveUserBookings(resultParams)
		.then(result => {
			let selectedBooking = result.context.user_bookings[index] || null;
			resultParams.context.selected_booking = selectedBooking;
			debug('getBookingByIndex result: ', selectedBooking);
			resolve(result);
		})
		.catch(reject)
	})
}

function createBookings(params){
	debug('create: ', params);
	const resultParams = Object.assign({}, params);

	return new Promise((resolve, reject) => {
		const action = params.actions[0];
		// let begin = new Date(params.context.date).valueOf();
		const begin = new Date(action.parameters.date+" "+action.parameters.begin).valueOf();
		const end = new Date(action.parameters.date+" "+action.parameters.end).valueOf();
		const query = {
		    begin: begin,
		    end: end,
		    // end: (begin + parseDuration(action.parameters.end)),
		    user_id: resultParams.context.user_id,
		    user_name: resultParams.context.user_name
		};

		if(resultParams.context.mentions) query.mentions = resultParams.context.mentions;

		checkCollisions(resultParams)
		.then(result => {
			if(result.context.collisions && result.context.collisions.length) return resolve(result);
			return new Booking(query).save();
		})
		.then(result => {
			resultParams.context.booking_completed = true;
			resolve(resultParams);
		})
		.catch(reject);

	});
		
}

function getActiveUserBookings(params){
	debug('getUserBookings: ', params);
	const resultParams = Object.assign({}, params);
	const actionParams = resultParams.actions[0].parameters;
	const begin = (resultParams.context.date && new Date(resultParams.context.date).valueOf() > Date.now())
				? new Date(resultParams.context.date).valueOf() : Date.now();
	const query = { user_id: resultParams.context.user_id, begin: { $gt: begin }, canceled: false };

	if(resultParams.context.date) query.end = { $lte: new Date(resultParams.context.date).setHours(23,59,59,999) };

	debug('getActiveUserBookings', query)

	return new Promise((resolve, reject) => {

		Booking.find(query)
		.then(result => {
			debug('getActiveUserBookings result', result)
			resultParams.context.user_bookings = result.length ? result.map(utils.toTimeAndDateBookingString).map(utils.numerateBookings) : [];
			resolve(resultParams);
		})
		.catch(reject)

	});
}

// function update(query, params){
// 	debug('update: ', params);
// 	return Booking.update(query, params);
// }

function cancelBooking(params){
	debug('cancelBooking: ', params);
	const resultParams = Object.assign({}, params);
	let promise;
	
	return new Promise((resolve, reject) => {

		const id = resultParams.context.booking_id;
		
		if(id >= 0) {
			promise = Booking.findOneAndUpdate({ _id: id, user_id: resultParams.context.user_id }, { canceled: true });
		// } else if(id === 0) {
		// 	promise = Booking.findAndModify({ _id: id, user_id: resultParams.context.user_id }, { canceled: true })
		} else {
			resultParams.context.booking_canceled = false;
			return resolve(resultParams);
		}

		promise
		.then(result => {
			resultParams.context.booking_canceled = !!result;
			resolve(resultParams);
		})
		.catch(reject)

	});
}

function checkCollisions(params) {
	const resultParams = Object.assign({}, params);
	const actionParams = resultParams.actions[0].parameters;
	const begin = new Date(actionParams.date+" "+actionParams.begin).valueOf();
	const end = new Date(actionParams.date+" "+actionParams.end).valueOf();
	const query = {
		canceled: false,
	    $or: [
			{ $and: [{ begin: { $lte: begin }}, { end: { $gt: begin } }] },
			{ $and: [{ begin: { $gte: begin }}, { begin: { $lt: end } }] }
		]
	};

	debug('checkCollisions', query, begin, end)

	return new Promise((resolve, reject) => {

		Booking.find(query)
		.then(result => {
			debug('checkCollisions result', result)
			resultParams.context.collisions = result.length ? result.map(utils.toFullBookingString) : [];
			// if(result.length) {
			// 	debug('resultParams.text: ', resultParams.output.text, result.map(toBookString).join(', '));
			// 	resultParams.output.text = resultParams.output.text || [];
			// 	resultParams.output.text[0] = result.map(toBookString).join(', ');
			// }
			if(result.length) return getFreeSlots(resultParams);
			else resolve(resultParams);
		})
		.then(resolve)
		.catch(reject)

	})
}

function getFreeSlots(params) {
	return new Promise((resolve, reject) => {
		debug('getFreeSlots: ', params);
		const resultParams = Object.assign({}, params); 
		const date = resultParams.actions[0].parameters.date;
		const startOfDay = new Date(date).setHours(0,0,0,0);
		const endOfDay = new Date(date).setHours(23,59,59,999);
		let freeSlots = [];
		let cursor = startOfDay;

		Booking.find({ 
			$and: [{ begin: { $gte: startOfDay } }, { end: { $lte: endOfDay } }, { canceled: false }]
		})
		.then(result => {
			if(!result.length) {
				freeSlots = ([{ begin: startOfDay, end: endOfDay }])
			} else {
				freeSlots = result.reduce((slots, item) => {
					if(item.begin !== cursor) slots.push({ begin: cursor, end: item.begin });
					cursor = item.end;
					return slots;
				}, []);
				if(cursor !== endOfDay) freeSlots.push({ begin: cursor, end: endOfDay });
			}
				
			resultParams.context.free_slots = freeSlots.map(utils.toTimeBookingString);

			debug('getFreeSlots result: ', result, freeSlots);

			resolve(resultParams);
		})
		.catch(reject);

	});
}

function notifyUsers(params) {
	debug('notifyUsers fetchApi: ', fetchApi);
	return new Promise((resolve, reject) => {
		const resultParams = Object.assign({}, params); 
		let users = resultParams.context.mentions.map(item => item.replace('@', '') );
		users = users.splice(users.indexOf(resultParams.context.bot_id));
		const message = ('Hi, '+resultParams.context.user_name+' created a mmeeting with you on '+resultParams.context.date+' from '+resultParams.context.begin+' to '+resultParams.context.end);
		sendMessageToUsers(users, message)
		.then(result => {
			resultParams.context.notified = true;
            resolve(resultParams)
		})
		.catch(reject);
		
	});
}