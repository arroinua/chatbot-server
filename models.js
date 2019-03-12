const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Context = new Schema({
	sessionid: String,
	conversation_id: String,
	has_conversations: Boolean,
	session_status: Number,
	bot_id: String,
	bot_name: String,
	user_id: String,
	user_name: String,
	system: {},
	date: String,
	begin: String,
	end: String,
	collisions: String,
	booking_id: String,
	booking_index: String,
	mentions: Array
});

const Booking = new Schema({
	begin: Number,
	end: Number,
	user_id: String,
	user_name: String,
	mentions: Array,
	canceled: { type: Boolean, default: false }
});

Booking.statics.findAndModify = function (query, sort, doc, options, callback) {
  return this.collection.findAndModify(query, sort, doc, options, callback);
};

const models = {
	Context: mongoose.model('Context', Context),
	Booking: mongoose.model('Booking', Booking)
}

// Booking.pre('save', function(next) {
// 	bookings.checkCollision(this)
// 	.then(result => {
// 		if(result.length) return 
// 	})
// })

module.exports = models;