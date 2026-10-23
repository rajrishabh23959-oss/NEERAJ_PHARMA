// Mongoose Schema for Emergency Contacts Entity
const mongoose = require('mongoose');

const emergencyContactSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  hospitalId: { type: String, ref: 'Hospital', default: null },
  name: { type: String, required: true, trim: true },
  type: { type: String, required: true, default: 'Medical Emergency' },
  phoneNumber: { type: String, required: true },
  secondaryPhone: { type: String, default: '' },
  serviceScope: { type: String, required: true },
  availability: { type: String, default: '24x7 Free Service' },
  averageResponseTimeMinutes: { type: Number, default: 10, min: 0 },
  description: { type: String, default: '' },
  verified: { type: Boolean, default: true },
  verifiedAt: { type: String, default: null },
  verifiedBy: { type: String, default: null },
  verificationNotes: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('EmergencyContact', emergencyContactSchema);
