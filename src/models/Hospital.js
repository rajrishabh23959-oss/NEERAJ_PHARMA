// Mongoose Schema for Hospitals Entity
const mongoose = require('mongoose');

const hospitalSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  locationId: { type: String, ref: 'Location' },
  name: { type: String, required: true, trim: true, minlength: 3 },
  address: { type: String, required: true, trim: true, minlength: 5 },
  city: { type: String, required: true, default: 'New Delhi' },
  state: { type: String, required: true, default: 'Delhi' },
  postalCode: { type: String, default: '' },
  latitude: { type: Number, required: true, min: -90, max: 90 },
  longitude: { type: Number, required: true, min: -180, max: 180 },
  phone: { type: String, required: true },
  emergencyHotline: { type: String, required: true },
  email: { type: String, default: '' },
  facilityType: { type: String, required: true, default: 'General Hospital' },
  operatingHours: { type: String, required: true, default: '24 Hours / 7 Days' },
  operatingSchedule: {
    openTime: { type: String, default: '00:00' },
    closeTime: { type: String, default: '23:59' },
    days: { type: [String], default: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] }
  },
  open24x7: { type: Boolean, default: true },
  hasEmergency: { type: Boolean, default: true },
  totalBeds: { type: Number, default: 100, min: 0 },
  availableBeds: { type: Number, default: 20, min: 0 },
  icuBedsAvailable: { type: Number, default: 5, min: 0 },
  ventilatorBedsAvailable: { type: Number, default: 2, min: 0 },
  specialties: { type: [String], default: [] },
  services: { type: [String], default: [] },
  rating: { type: Number, default: 4.5, min: 0, max: 5 },
  verified: { type: Boolean, default: false },
  verifiedAt: { type: String, default: null },
  verifiedBy: { type: String, default: null },
  verificationNotes: { type: String, default: '' },
  website: { type: String, default: '' }
}, { timestamps: true });

hospitalSchema.index({ latitude: 1, longitude: 1 });
hospitalSchema.index({ verified: 1, facilityType: 1 });

module.exports = mongoose.model('Hospital', hospitalSchema);
