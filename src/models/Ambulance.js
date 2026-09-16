const mongoose = require('mongoose');

const ambulanceSchema = new mongoose.Schema(
  {
    vehicleNumber: {
      type: String,
      required: [true, 'Please provide vehicle registration number'],
      unique: true,
      trim: true,
    },
    type: {
      type: String,
      required: [true, 'Please provide ambulance type'],
      enum: [
        'Advanced Life Support (ALS)',
        'Basic Life Support (BLS)',
        'Patient Transport Vehicle (PTV)',
        'Neonatal Ambulance',
        'Mobile ICU',
      ],
      default: 'Basic Life Support (BLS)',
    },
    providerName: {
      type: String,
      required: [true, 'Please provide service provider or hospital name'],
      trim: true,
    },
    baseHospital: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hospital',
      default: null,
    },
    driverName: {
      type: String,
      required: [true, 'Please provide driver/paramedic name'],
      trim: true,
    },
    contactNumber: {
      type: String,
      required: [true, 'Please provide emergency contact number'],
      trim: true,
    },
    alternateContact: {
      type: String,
      trim: true,
      default: '',
    },
    city: {
      type: String,
      required: [true, 'Please provide base city'],
      trim: true,
      index: true,
    },
    currentLocation: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        required: [true, 'Coordinates [longitude, latitude] are required'],
        validate: {
          validator: function (coords) {
            return (
              Array.isArray(coords) &&
              coords.length === 2 &&
              coords[0] >= -180 &&
              coords[0] <= 180 &&
              coords[1] >= -90 &&
              coords[1] <= 90
            );
          },
          message: 'Coordinates must be valid [longitude, latitude]',
        },
      },
    },
    status: {
      type: String,
      enum: ['available', 'on_call', 'dispatched', 'maintenance'],
      default: 'available',
      index: true,
    },
    equipment: [
      {
        type: String,
        trim: true,
      },
    ],
    is24x7: {
      type: Boolean,
      default: true,
    },
    chargesPerKm: {
      type: Number,
      default: 25,
    },
    baseFare: {
      type: Number,
      default: 500,
    },
    rating: {
      type: Number,
      default: 4.7,
    },
  },
  {
    timestamps: true,
  }
);

ambulanceSchema.index({ currentLocation: '2dsphere' });

module.exports = mongoose.model('Ambulance', ambulanceSchema);
