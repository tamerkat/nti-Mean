// models/Booking.js
const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  date: { type: String, required: true },
  time: { type: String, required: true },
  name: { type: String, required: true },
  phone: { type: String, required: true },
  person: { type: Number, required: true }
});

module.exports = mongoose.model('Booking', bookingSchema);
