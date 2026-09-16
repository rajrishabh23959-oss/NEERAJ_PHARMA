require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB } = require('../config/db');

const User = require('../models/User');
const Hospital = require('../models/Hospital');
const Doctor = require('../models/Doctor');
const EmergencyContact = require('../models/EmergencyContact');
const Ambulance = require('../models/Ambulance');

const seedData = async () => {
  try {
    console.log('🌱 Starting Neerajpharma database seeding...');
    await connectDB();

    // Clear existing collections
    await User.deleteMany();
    await Hospital.deleteMany();
    await Doctor.deleteMany();
    await EmergencyContact.deleteMany();
    await Ambulance.deleteMany();

    console.log('🧹 Cleaned existing database records.');

    // 1. Seed Users (Super Admin, Hospital Admin, Regular User)
    const adminUser = await User.create({
      name: 'Dr. Neeraj Sharma (Chief Administrator)',
      email: 'admin@neerajpharma.com',
      password: 'AdminPassword123!',
      phone: '+91 98100 12345',
      role: 'super_admin',
    });

    const hospitalAdminUser = await User.create({
      name: 'Rajesh Verma (AIIMS Hospital Admin)',
      email: 'rajesh.verma@aiims.edu',
      password: 'HospitalAdmin123!',
      phone: '+91 98111 23456',
      role: 'hospital_admin',
    });

    const regularUser = await User.create({
      name: 'Priya Patel',
      email: 'priya.patel@gmail.com',
      password: 'UserPassword123!',
      phone: '+91 98222 34567',
      role: 'user',
      emergencyContacts: [
        { name: 'Amit Patel', phone: '+91 98222 99999', relationship: 'Spouse' },
        { name: 'Sunita Patel', phone: '+91 98222 88888', relationship: 'Mother' },
      ],
    });

    console.log('👤 Users seeded.');

    // 2. Seed Hospitals (Realistic coordinates in Delhi NCR & Bangalore)
    const hospitalsData = [
      {
        name: 'AIIMS (All India Institute of Medical Sciences)',
        registrationNumber: 'DL-HOSP-001',
        type: 'Government',
        address: {
          street: 'Sri Aurobindo Marg, Ansari Nagar East',
          area: 'Ansari Nagar',
          city: 'New Delhi',
          state: 'Delhi',
          postalCode: '110029',
        },
        location: {
          type: 'Point',
          coordinates: [77.2090, 28.5672], // [lng, lat]
        },
        contactPhone: '+91 11 2658 8500',
        emergencyHotline: '+91 11 2659 4405',
        email: 'emergency@aiims.edu',
        website: 'https://www.aiims.edu',
        operatingHours: '24 Hours / 7 Days',
        is24x7: true,
        facilities: [
          'ICU',
          'NICU',
          'Trauma Center',
          'Blood Bank',
          'CT Scan',
          'MRI',
          'Dialysis',
          'Ambulance Service',
          'Oxygen Supply',
          'Burn Care Unit',
          'Pharmacy 24x7',
        ],
        specialties: [
          'Emergency Medicine',
          'Cardiology',
          'Neurology',
          'Orthopedics',
          'Oncology',
          'Pediatrics',
          'Pulmonology',
        ],
        availability: {
          totalBeds: 2478,
          availableBeds: 142,
          icuBeds: 280,
          availableIcuBeds: 18,
          oxygenBeds: 450,
          availableOxygenBeds: 62,
          ambulanceCount: 15,
          isEmergencyAccepting: true,
        },
        isVerified: true,
        rating: 4.9,
        reviewsCount: 1240,
        image: 'https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?auto=format&fit=crop&w=800&q=80',
      },
      {
        name: 'Safdarjung Hospital & Vardhman Mahavir Medical College',
        registrationNumber: 'DL-HOSP-002',
        type: 'Government',
        address: {
          street: 'Ring Road, Opposite AIIMS',
          area: 'Ansari Nagar West',
          city: 'New Delhi',
          state: 'Delhi',
          postalCode: '110029',
        },
        location: {
          type: 'Point',
          coordinates: [77.2052, 28.5701],
        },
        contactPhone: '+91 11 2616 5060',
        emergencyHotline: '+91 11 2616 5032',
        email: 'safdarjung@nic.in',
        website: 'http://www.vmmc-sjh.nic.in',
        operatingHours: '24 Hours / 7 Days',
        is24x7: true,
        facilities: [
          'ICU',
          'Trauma Center',
          'Burn Center',
          'Blood Bank',
          'Dialysis',
          'Ambulance Service',
          'Oxygen Supply',
        ],
        specialties: [
          'Trauma Surgery',
          'Burns & Plastic Surgery',
          'Orthopedics',
          'Cardiology',
          'General Surgery',
        ],
        availability: {
          totalBeds: 1800,
          availableBeds: 95,
          icuBeds: 150,
          availableIcuBeds: 9,
          oxygenBeds: 300,
          availableOxygenBeds: 40,
          ambulanceCount: 10,
          isEmergencyAccepting: true,
        },
        isVerified: true,
        rating: 4.6,
        reviewsCount: 890,
        image: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=800&q=80',
      },
      {
        name: 'Max Super Speciality Hospital, Saket',
        registrationNumber: 'DL-HOSP-003',
        type: 'Super-Specialty',
        address: {
          street: '1, 2, Press Enclave Marg, Saket',
          area: 'Saket',
          city: 'New Delhi',
          state: 'Delhi',
          postalCode: '110017',
        },
        location: {
          type: 'Point',
          coordinates: [77.2144, 28.5283],
        },
        contactPhone: '+91 11 2651 5050',
        emergencyHotline: '+91 11 4055 4055',
        email: 'emergency.saket@maxhealthcare.com',
        website: 'https://www.maxhealthcare.in',
        operatingHours: '24 Hours / 7 Days',
        is24x7: true,
        facilities: [
          'ICU',
          'NICU',
          'Cath Lab',
          'Cardiac Care Unit',
          'Blood Bank',
          'CT Scan',
          'MRI',
          'Dialysis',
          'Advanced Ambulance Fleet',
        ],
        specialties: [
          'Cardiology',
          'Cardiac Surgery',
          'Neurosciences',
          'Orthopedics',
          'Robotic Surgery',
          'Critical Care',
        ],
        availability: {
          totalBeds: 530,
          availableBeds: 48,
          icuBeds: 85,
          availableIcuBeds: 12,
          oxygenBeds: 150,
          availableOxygenBeds: 35,
          ambulanceCount: 8,
          isEmergencyAccepting: true,
        },
        isVerified: true,
        rating: 4.8,
        reviewsCount: 1520,
        image: 'https://images.unsplash.com/photo-1512678080530-7760d81faba6?auto=format&fit=crop&w=800&q=80',
      },
      {
        name: 'Fortis Escorts Heart Institute, Okhla',
        registrationNumber: 'DL-HOSP-004',
        type: 'Super-Specialty',
        address: {
          street: 'Okhla Road, Sukhdev Vihar Metro Station',
          area: 'Okhla',
          city: 'New Delhi',
          state: 'Delhi',
          postalCode: '110025',
        },
        location: {
          type: 'Point',
          coordinates: [77.2798, 28.5606],
        },
        contactPhone: '+91 11 4713 5000',
        emergencyHotline: '+91 11 1050 10',
        email: 'fehi.care@fortishealthcare.com',
        website: 'https://www.fortishealthcare.com',
        operatingHours: '24 Hours / 7 Days',
        is24x7: true,
        facilities: [
          'Cardiac ICU',
          'Cath Lab 24x7',
          'Heart Failure Clinic',
          'Mobile Cardiac ICU',
          'Blood Bank',
          'Emergency Ward',
        ],
        specialties: [
          'Cardiology',
          'Pediatric Cardiology',
          'Cardiovascular Surgery',
          'Electrophysiology',
        ],
        availability: {
          totalBeds: 310,
          availableBeds: 32,
          icuBeds: 60,
          availableIcuBeds: 8,
          oxygenBeds: 90,
          availableOxygenBeds: 21,
          ambulanceCount: 6,
          isEmergencyAccepting: true,
        },
        isVerified: true,
        rating: 4.7,
        reviewsCount: 980,
        image: 'https://images.unsplash.com/photo-1538108149393-fbbd81895907?auto=format&fit=crop&w=800&q=80',
      },
      {
        name: 'Medanta - The Medicity',
        registrationNumber: 'HR-HOSP-005',
        type: 'Super-Specialty',
        address: {
          street: 'CH Bakhtawar Singh Road, Sector 38',
          area: 'Sector 38',
          city: 'Gurugram',
          state: 'Haryana',
          postalCode: '122001',
        },
        location: {
          type: 'Point',
          coordinates: [77.0425, 28.4395],
        },
        contactPhone: '+91 124 414 1414',
        emergencyHotline: '+91 124 4834 112',
        email: 'info@medanta.org',
        website: 'https://www.medanta.org',
        operatingHours: '24 Hours / 7 Days',
        is24x7: true,
        facilities: [
          'Level 1 Trauma Center',
          'ICU',
          'Air Ambulance Support',
          'Organ Transplant Unit',
          'Blood Bank',
          'PET CT Scan',
          'Dialysis',
        ],
        specialties: [
          'Heart Institute',
          'Institute of Neurosciences',
          'Liver Transplant',
          'Orthopedics',
          'Emergency & Trauma',
        ],
        availability: {
          totalBeds: 1250,
          availableBeds: 110,
          icuBeds: 250,
          availableIcuBeds: 24,
          oxygenBeds: 320,
          availableOxygenBeds: 50,
          ambulanceCount: 14,
          isEmergencyAccepting: true,
        },
        isVerified: true,
        rating: 4.8,
        reviewsCount: 2100,
        image: 'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?auto=format&fit=crop&w=800&q=80',
      },
    ];

    const hospitals = await Hospital.insertMany(hospitalsData);
    console.log(`🏥 ${hospitals.length} Hospitals seeded.`);

    // Assign AIIMS to hospital admin user
    hospitalAdminUser.hospitalAssigned = hospitals[0]._id;
    await hospitalAdminUser.save();

    // 3. Seed Doctors
    const doctorsData = [
      {
        hospital: hospitals[0]._id, // AIIMS
        name: 'Dr. Arvind Mehra',
        specialization: 'Emergency Medicine',
        department: 'Emergency & Trauma',
        qualification: 'MBBS, MD (Emergency Medicine), FACEM',
        experienceYears: 16,
        contactNumber: '+91 98101 44556',
        email: 'arvind.mehra@aiims.edu',
        consultationFee: 0,
        availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        shiftHours: '24x7 On-Call / Emergency Rotation',
        isEmergencyAvailable: true,
        rating: 4.9,
      },
      {
        hospital: hospitals[0]._id, // AIIMS
        name: 'Dr. Sunita Kulkarni',
        specialization: 'Cardiology',
        department: 'Cardiology Department',
        qualification: 'MBBS, MD, DM (Cardiology)',
        experienceYears: 19,
        contactNumber: '+91 98101 77889',
        email: 'sunita.k@aiims.edu',
        consultationFee: 0,
        availableDays: ['Monday', 'Wednesday', 'Friday'],
        shiftHours: '09:00 AM - 04:00 PM',
        isEmergencyAvailable: true,
        rating: 4.9,
      },
      {
        hospital: hospitals[2]._id, // Max Saket
        name: 'Dr. Vikram Malhotra',
        specialization: 'Cardiology & Critical Care',
        department: 'Cardiac Sciences',
        qualification: 'MBBS, MS, MCh (CTVS), FACC',
        experienceYears: 22,
        contactNumber: '+91 98112 33445',
        email: 'dr.malhotra@maxhealthcare.com',
        consultationFee: 1500,
        availableDays: ['Monday', 'Tuesday', 'Thursday', 'Saturday'],
        shiftHours: '10:00 AM - 05:00 PM',
        isEmergencyAvailable: true,
        rating: 4.8,
      },
      {
        hospital: hospitals[2]._id, // Max Saket
        name: 'Dr. Ananya Ray',
        specialization: 'Neurology',
        department: 'Neurosciences',
        qualification: 'MBBS, MD (Medicine), DM (Neurology)',
        experienceYears: 14,
        contactNumber: '+91 98112 66778',
        email: 'dr.ray@maxhealthcare.com',
        consultationFee: 1200,
        availableDays: ['Tuesday', 'Thursday', 'Friday'],
        shiftHours: '11:00 AM - 04:00 PM',
        isEmergencyAvailable: false,
        rating: 4.7,
      },
      {
        hospital: hospitals[4]._id, // Medanta
        name: 'Dr. Naresh Trehan Team / Dr. Sandeep Singh',
        specialization: 'Interventional Cardiology',
        department: 'Cardiovascular Care',
        qualification: 'MBBS, MD, FESC',
        experienceYears: 18,
        contactNumber: '+91 98124 99112',
        email: 'dr.sandeep@medanta.org',
        consultationFee: 1800,
        availableDays: ['Monday', 'Wednesday', 'Thursday', 'Saturday'],
        shiftHours: '09:30 AM - 05:30 PM',
        isEmergencyAvailable: true,
        rating: 4.9,
      },
    ];

    await Doctor.insertMany(doctorsData);
    console.log(`👨‍⚕️ ${doctorsData.length} Doctors seeded.`);

    // 4. Seed Ambulances
    const ambulancesData = [
      {
        vehicleNumber: 'DL-01-EA-1081',
        type: 'Advanced Life Support (ALS)',
        providerName: 'AIIMS Emergency Fleet',
        baseHospital: hospitals[0]._id,
        driverName: 'Satish Kumar & Paramedic Rakesh',
        contactNumber: '+91 98100 11081',
        city: 'New Delhi',
        currentLocation: {
          type: 'Point',
          coordinates: [77.2085, 28.5680],
        },
        status: 'available',
        equipment: ['Ventilator', 'Defibrillator', 'Oxygen Cylinder', 'ECG Monitor', 'Infusion Pump'],
        is24x7: true,
        chargesPerKm: 20,
        baseFare: 400,
      },
      {
        vehicleNumber: 'DL-02-MB-2022',
        type: 'Mobile ICU',
        providerName: 'Max Healthcare Emergency Response',
        baseHospital: hospitals[2]._id,
        driverName: 'Deepak Sharma',
        contactNumber: '+91 98100 22022',
        city: 'New Delhi',
        currentLocation: {
          type: 'Point',
          coordinates: [77.2150, 28.5290],
        },
        status: 'available',
        equipment: ['Transport Ventilator', 'Multipara Monitor', 'Syringe Pumps', 'Suction Machine', 'Stretcher'],
        is24x7: true,
        chargesPerKm: 35,
        baseFare: 800,
      },
      {
        vehicleNumber: 'HR-26-MD-4040',
        type: 'Advanced Life Support (ALS)',
        providerName: 'Medanta Flying Doctors & Road Fleet',
        baseHospital: hospitals[4]._id,
        driverName: 'Manish Yadav',
        contactNumber: '+91 98124 40404',
        city: 'Gurugram',
        currentLocation: {
          type: 'Point',
          coordinates: [77.0430, 28.4400],
        },
        status: 'available',
        equipment: ['Ventilator', 'External Pacemaker', 'Oxygen Unit', 'Automated CPR'],
        is24x7: true,
        chargesPerKm: 30,
        baseFare: 700,
      },
      {
        vehicleNumber: 'DL-03-BL-1020',
        type: 'Basic Life Support (BLS)',
        providerName: 'National Red Cross Emergency',
        baseHospital: null,
        driverName: 'Arun Singh',
        contactNumber: '+91 98100 33033',
        city: 'New Delhi',
        currentLocation: {
          type: 'Point',
          coordinates: [77.2200, 28.6000],
        },
        status: 'available',
        equipment: ['Oxygen Cylinder', 'First Aid Kit', 'Spine Board', 'Blood Pressure Monitor'],
        is24x7: true,
        chargesPerKm: 18,
        baseFare: 300,
      },
    ];

    await Ambulance.insertMany(ambulancesData);
    console.log(`🚑 ${ambulancesData.length} Ambulances seeded.`);

    // 5. Seed Emergency Contacts / Helplines
    const emergencyContactsData = [
      {
        category: 'National Emergency',
        title: 'National Emergency Unified Helpline (ERSS)',
        number: '112',
        alternateNumber: '112',
        level: 'National',
        state: 'All India',
        city: 'All Cities',
        isTollFree: true,
        isAvailable24x7: true,
        description: 'Single unified emergency response number for Police, Fire, and Medical emergencies in India.',
        priority: 1,
      },
      {
        category: 'Ambulance',
        title: 'Emergency Medical & Ambulance Toll-Free',
        number: '108',
        alternateNumber: '102',
        level: 'National',
        state: 'All India',
        city: 'All Cities',
        isTollFree: true,
        isAvailable24x7: true,
        description: 'Emergency 24x7 ambulance dispatch for road accidents, critical trauma, and urgent patient transport.',
        priority: 1,
      },
      {
        category: 'Police',
        title: 'Police Emergency Response',
        number: '100',
        alternateNumber: '112',
        level: 'National',
        state: 'All India',
        city: 'All Cities',
        isTollFree: true,
        isAvailable24x7: true,
        description: 'Immediate police assistance and crime reporting.',
        priority: 2,
      },
      {
        category: 'Fire Brigade',
        title: 'Fire & Rescue Service',
        number: '101',
        alternateNumber: '112',
        level: 'National',
        state: 'All India',
        city: 'All Cities',
        isTollFree: true,
        isAvailable24x7: true,
        description: 'Emergency fire fighting, building collapse, and hazardous chemical response.',
        priority: 2,
      },
      {
        category: 'Blood Bank',
        title: 'Central Blood Bank Helpline & Coordination',
        number: '104',
        alternateNumber: '+91 11 2371 6441',
        level: 'National',
        state: 'All India',
        city: 'All Cities',
        isTollFree: true,
        isAvailable24x7: true,
        description: 'Emergency blood donation, blood group availability, and plasma registry.',
        priority: 3,
      },
      {
        category: 'Disaster Management',
        title: 'National Disaster Management Authority (NDMA)',
        number: '1078',
        alternateNumber: '011-26701728',
        level: 'National',
        state: 'All India',
        city: 'All Cities',
        isTollFree: true,
        isAvailable24x7: true,
        description: 'Earthquake, floods, cyclone, and major national crisis response.',
        priority: 3,
      },
      {
        category: 'Women Helpline',
        title: 'National Women Emergency Helpline',
        number: '1091',
        alternateNumber: '181',
        level: 'National',
        state: 'All India',
        city: 'All Cities',
        isTollFree: true,
        isAvailable24x7: true,
        description: '24x7 women distress, rescue, and safety hotline.',
        priority: 3,
      },
      {
        category: 'Poison Control',
        title: 'National Poisons Information Centre (AIIMS)',
        number: '1800 116 117',
        alternateNumber: '011-26593677',
        level: 'National',
        state: 'All India',
        city: 'All Cities',
        isTollFree: true,
        isAvailable24x7: true,
        description: 'Immediate toxicology advice for acute chemical, drug, snake bite, or plant poisoning.',
        priority: 3,
      },
    ];

    await EmergencyContact.insertMany(emergencyContactsData);
    console.log(`📞 ${emergencyContactsData.length} Emergency Contacts seeded.`);

    console.log('\n=============================================');
    console.log('🎉 NEERAJPHARMA DATABASE SEEDING COMPLETED!');
    console.log('=============================================');
    console.log('Admin Account: admin@neerajpharma.com / AdminPassword123!');
    console.log('Hospital Admin: rajesh.verma@aiims.edu / HospitalAdmin123!');
    console.log('User Account: priya.patel@gmail.com / UserPassword123!');
    console.log('=============================================\n');

    if (require.main === module) {
      process.exit(0);
    }
  } catch (err) {
    console.error('❌ Database seeding error:', err);
    if (require.main === module) {
      process.exit(1);
    }
  }
};

// Check if run directly from command line
if (require.main === module) {
  if (process.argv[2] === '-d') {
    // Destroy data only
    (async () => {
      await connectDB();
      await User.deleteMany();
      await Hospital.deleteMany();
      await Doctor.deleteMany();
      await EmergencyContact.deleteMany();
      await Ambulance.deleteMany();
      console.log('💥 All database records deleted.');
      process.exit(0);
    })();
  } else {
    seedData();
  }
}

module.exports = seedData;
