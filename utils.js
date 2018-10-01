const debug = require('debug');

module.exports = { 
	toTimeBookingString, 
	toTimeAndDateBookingString, 
	toFullBookingString, 
	numerateBookings, 
	parseDuration,
	isMentioned
};

function toTimeBookingString(item) {
	debug('toBookString: ',item);
	return {
		text: (new Date(item.begin).toLocaleTimeString())+'-'+(new Date(item.end).toLocaleTimeString()),
		id: item._id

	}
}

function toTimeAndDateBookingString(item) {
	const begin = new Date(item.begin);
	const end = new Date(item.end);
	return {
		text: (begin.toLocaleDateString() + ' ' + begin.toLocaleTimeString() + '-' + end.toLocaleTimeString()),
		id: item._id
	}
}

function toFullBookingString(item) {
	debug('toBookString: ',item);
	return {
		text: (item.user_name+' '+(new Date(item.begin).toLocaleTimeString())+'-'+new Date(item.end).toLocaleTimeString()),
		id: item._id
	}
}

function numerateBookings(item, index, array) {
	return {
		text: (array.length > 1 ? (index+1)+') '+item.text : item.text),
		id: item.id
	}
}

function parseDuration(value) {
	const vals = value.split(':');
	return ( parseFloat(vals[0]*60*60*1000) + parseFloat(vals[1]*60*1000) + parseFloat(vals[2]*1000) );
}

function isMentioned(str, userName) {
	return str.indexOf('@'+userName) !== -1;
}
