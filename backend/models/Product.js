const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  farmerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  cropName: { type: String, required: true },
  quantity: { type: Number, required: true }, // in kg/quintals
  qualityGrade: { type: String, enum: ['A', 'B', 'C'], default: 'A' },
  askingPrice: { type: Number, required: true },
  images: [String], // URLs to uploaded photos
  status: { type: String, enum: ['available', 'sold'], default: 'available' },
  location: {
    type: { type: String, default: 'Point' },
    coordinates: [Number] // [longitude, latitude] for geo-matching
  }
}, { timestamps: true });

ProductSchema.index({ location: '2dsphere' }); // Enables location-based matching for Person 4

module.exports = mongoose.model('Product', ProductSchema);