// Mongoose Schema for Doctors Entity
const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  hospitalId: { type: String, ref: 'Hospital', required: true },
  name: { type: String, required: true, trim: true, minlength: 3 },
  specialty: { type: String, required: true, trim: true },
  qualifications: { type: String, required: true },
  experienceYears: { type: Number, default: 5, min: 0 },
  contact: { type: String, required: true },
  email: { type: String, default: '' },
  availability: { type: String, required: true },
  shiftSchedule: {
    startTime: { type: String, default: '09:00' },
    endTime: { type: String, default: '17:00' },
    days: { type: [String], default: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] }
  },
  emergencyOnCall: { type: Boolean, default: false },
  consultationFee: { type: Number, default: 1000, min: 0 },
  bio: { type: String, default: '' }
}, { timestamps: true });

doctorSchema.index({ hospitalId: 1, specialty: 1 });

module.exports = mongoose.model('Doctor', doctorSchema);
