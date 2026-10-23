// Mongoose Schema for Emergency Dispatches
const mongoose = require('mongoose');

const dispatchSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  trackingId: { type: String, required: true, unique: true },
  patientName: { type: String, required: true },
  contactPhone: { type: String, required: true },
  emergencyType: { type: String, required: true },
  vehicleType: { type: String, required: true },
  assignedAmbulanceId: { type: String, ref: 'Ambulance' },
  userCoordinates: {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true }
  },
  destinationHospital: { type: Object, default: null },
  distanceKm: { type: Number },
  estimatedArrivalMinutes: { type: Number, required: true },
  notes: { type: String, default: '' },
  status: { type: String, default: 'Dispatched' }
}, { timestamps: true });

module.exports = mongoose.model('Dispatch', dispatchSchema);
