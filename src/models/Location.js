// Mongoose Schema for Locations Entity
const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  cityName: { type: String, required: true, trim: true },
  state: { type: String, required: true, trim: true },
  address: { type: String, required: true, trim: true },
  postalCode: { type: String, default: '' },
  latitude: { type: Number, required: true, min: -90, max: 90 },
  longitude: { type: Number, required: true, min: -180, max: 180 },
  keyArea: { type: String, default: '' },
  zoneType: { type: String, default: 'Urban Medical Hub' },
  hospitalCount: { type: Number, default: 0, min: 0 }
}, { timestamps: true });

locationSchema.index({ latitude: 1, longitude: 1 });

module.exports = mongoose.model('Location', locationSchema);
