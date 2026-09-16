const mongoose = require('mongoose');

const hospitalSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide the hospital name'],
      trim: true,
      maxlength: [150, 'Hospital name cannot exceed 150 characters'],
    },
    registrationNumber: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    type: {
      type: String,
      required: [true, 'Please specify hospital type'],
      enum: [
        'Government',
        'Private',
        'Multi-Specialty',
        'Super-Specialty',
        'Clinic',
        'Trauma Center',
        'Nursing Home',
      ],
      default: 'Multi-Specialty',
    },
    address: {
      street: { type: String, required: true },
      area: { type: String, default: '' },
      landmark: { type: String, default: '' },
      city: { type: String, required: true, index: true },
      state: { type: String, required: true },
      postalCode: { type: String, required: true },
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      // [longitude, latitude]
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
    contactPhone: {
      type: String,
      required: [true, 'Please provide a primary contact phone number'],
      trim: true,
    },
    emergencyHotline: {
      type: String,
      required: [true, 'Please provide an emergency hotline number'],
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    website: {
      type: String,
      trim: true,
    },
    operatingHours: {
      type: String,
      default: '24 Hours / 7 Days',
    },
    is24x7: {
      type: Boolean,
      default: true,
    },
    facilities: [
      {
        type: String,
        trim: true,
      },
    ],
    specialties: [
      {
        type: String,
        trim: true,
      },
    ],
    availability: {
      totalBeds: { type: Number, default: 100 },
      availableBeds: { type: Number, default: 20 },
      icuBeds: { type: Number, default: 20 },
      availableIcuBeds: { type: Number, default: 5 },
      oxygenBeds: { type: Number, default: 30 },
      availableOxygenBeds: { type: Number, default: 10 },
      ambulanceCount: { type: Number, default: 2 },
      isEmergencyAccepting: { type: Boolean, default: true },
      lastUpdated: { type: Date, default: Date.now },
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    rating: {
      type: Number,
      min: [0, 'Rating cannot be less than 0'],
      max: [5, 'Rating cannot exceed 5'],
      default: 4.5,
    },
    reviewsCount: {
      type: Number,
      default: 0,
    },
    image: {
      type: String,
      default: 'https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?auto=format&fit=crop&w=800&q=80',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Geospatial index for nearby queries
hospitalSchema.index({ location: '2dsphere' });
hospitalSchema.index({ name: 'text', 'address.city': 'text', specialties: 'text' });

// Virtual to populate doctors
hospitalSchema.virtual('doctors', {
  ref: 'Doctor',
  localField: '_id',
  foreignField: 'hospital',
  justOne: false,
});

// Virtual to populate ambulances
hospitalSchema.virtual('ambulances', {
  ref: 'Ambulance',
  localField: '_id',
  foreignField: 'baseHospital',
  justOne: false,
});

module.exports = mongoose.model('Hospital', hospitalSchema);
