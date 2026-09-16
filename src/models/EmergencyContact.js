const mongoose = require('mongoose');

const emergencyContactSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      required: [true, 'Please provide category'],
      enum: [
        'National Emergency',
        'Ambulance',
        'Police',
        'Fire Brigade',
        'Disaster Management',
        'Women Helpline',
        'Child Helpline',
        'Blood Bank',
        'Poison Control',
        'Mental Health & Suicide Prevention',
        'Senior Citizen Helpline',
        'COVID-19 Helpline',
      ],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Please provide service title (e.g. Central Emergency Response)'],
      trim: true,
    },
    number: {
      type: String,
      required: [true, 'Please provide helpline number'],
      trim: true,
    },
    alternateNumber: {
      type: String,
      trim: true,
      default: '',
    },
    level: {
      type: String,
      enum: ['National', 'State', 'City'],
      default: 'National',
    },
    state: {
      type: String,
      default: 'All India',
    },
    city: {
      type: String,
      default: 'All Cities',
      index: true,
    },
    isTollFree: {
      type: Boolean,
      default: true,
    },
    isAvailable24x7: {
      type: Boolean,
      default: true,
    },
    description: {
      type: String,
      default: '',
    },
    priority: {
      type: Number,
      default: 1, // 1 is highest priority
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('EmergencyContact', emergencyContactSchema);
