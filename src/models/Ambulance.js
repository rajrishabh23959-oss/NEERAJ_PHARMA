// Mongoose Schema for Ambulances Entity
const mongoose = require('mongoose');

const ambulanceSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  vehicleNumber: { type: String, required: true, unique: true },
  vehicleType: { type: String, required: true },
  driverName: { type: String, required: true },
  contactNumber: { type: String, required: true },
  currentLatitude: { type: Number, required: true, min: -90, max: 90 },
  currentLongitude: { type: Number, required: true, min: -180, max: 180 },
  hospitalAffiliation: { type: String, default: '' },
  hospitalId: { type: String, ref: 'Hospital', default: null },
  equipment: { type: [String], default: [] },
  status: { type: String, enum: ['Available', 'Dispatched', 'Maintenance'], default: 'Available' },
  baseCity: { type: String, default: 'New Delhi' },
  verified: { type: Boolean, default: true },
  verifiedAt: { type: String, default: null },
  verifiedBy: { type: String, default: null },
  verificationNotes: { type: String, default: '' }
}, { timestamps: true });

ambulanceSchema.index({ currentLatitude: 1, currentLongitude: 1, status: 1 });

module.exports = mongoose.model('Ambulance', ambulanceSchema);
