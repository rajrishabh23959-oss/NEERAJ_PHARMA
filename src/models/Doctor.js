const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema(
  {
    hospital: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hospital',
      required: [true, 'Doctor must be associated with a hospital'],
    },
    name: {
      type: String,
      required: [true, 'Please provide doctor name'],
      trim: true,
    },
    specialization: {
      type: String,
      required: [true, 'Please provide specialization'],
      trim: true,
      index: true,
    },
    department: {
      type: String,
      default: 'General Medicine',
    },
    qualification: {
      type: String,
      required: [true, 'Please provide qualifications (e.g. MBBS, MD)'],
      trim: true,
    },
    experienceYears: {
      type: Number,
      default: 5,
    },
    contactNumber: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    consultationFee: {
      type: Number,
      default: 500,
    },
    availableDays: {
      type: [String],
      default: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    },
    shiftHours: {
      type: String,
      default: '09:00 AM - 05:00 PM',
    },
    isEmergencyAvailable: {
      type: Boolean,
      default: false,
    },
    isAvailableToday: {
      type: Boolean,
      default: true,
    },
    rating: {
      type: Number,
      default: 4.8,
    },
    photo: {
      type: String,
      default: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=400&q=80',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Doctor', doctorSchema);
