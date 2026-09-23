const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  kisanId: { type: String, required: true, unique: true }, // Aadhaar or generated ID
  name: { type: String, required: true },
  phone: { type: String, required: true },
  role: { type: String, enum: ['farmer', 'buyer'], default: 'farmer' },
  location: {
    lat: Number,
    long: Number,
    address: String
  }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);