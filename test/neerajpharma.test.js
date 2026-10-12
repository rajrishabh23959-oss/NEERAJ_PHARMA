require('dotenv').config();
const request = require('supertest');
const app = require('../src/app');
const { connectDB, disconnectDB } = require('../src/config/db');
const seedData = require('../src/seed/seeder');
const Hospital = require('../src/models/Hospital');
const User = require('../src/models/User');
const Ambulance = require('../src/models/Ambulance');
const Doctor = require('../src/models/Doctor');
const EmergencyContact = require('../src/models/EmergencyContact');

let superAdminToken;
let hospitalAdminToken;
let userToken;
let seededHospital;
let seededAmbulance;

beforeAll(async () => {
  // Ensure DB connection and seeded data
  await connectDB();
  await seedData();

  // Ensure indexes are built
  await Hospital.init();
  await Ambulance.init();

  // Obtain tokens for all 3 RBAC roles
  const adminRes = await request(app)
    .post('/api/v1/auth/login')
    .send({
      email: 'admin@neerajpharma.com',
      password: 'AdminPassword123!',
    });
  superAdminToken = adminRes.body.token;

  const hospAdminRes = await request(app)
    .post('/api/v1/auth/login')
    .send({
      email: 'rajesh.verma@aiims.edu',
      password: 'HospitalAdmin123!',
    });
  hospitalAdminToken = hospAdminRes.body.token;

  const userRes = await request(app)
    .post('/api/v1/auth/login')
    .send({
      email: 'priya.patel@gmail.com',
      password: 'UserPassword123!',
    });
  userToken = userRes.body.token;

  seededHospital = await Hospital.findOne({ isActive: true });
  seededAmbulance = await Ambulance.findOne();
}, 60000);

afterAll(async () => {
  await disconnectDB();
});

describe('1. Database Schemas, Geospatial Indexing & Data Models', () => {
  it('should enforce coordinates bounds validator on Hospital schema', async () => {
    const invalidHospital = new Hospital({
      name: 'Invalid Hospital',
      address: { street: 'Main St', city: 'Delhi', state: 'Delhi', postalCode: '110001' },
      location: { type: 'Point', coordinates: [200, 100] }, // invalid lng > 180, lat > 90
      contactPhone: '+91 99999 00000',
      emergencyHotline: '+91 11 112',
    });
    let err;
    try {
      await invalidHospital.validate();
    } catch (e) {
      err = e;
    }
    expect(err).toBeDefined();
    expect(err.errors['location.coordinates']).toBeDefined();
  });

  it('should have 2dsphere geospatial index configured for Hospital and Ambulance', () => {
    const hospitalIndexes = Hospital.schema.indexes();
    const hasHospital2dSphere = hospitalIndexes.some(
      (idx) => idx[0].location === '2dsphere'
    );
    expect(hasHospital2dSphere).toBe(true);

    const ambulanceIndexes = Ambulance.schema.indexes();
    const hasAmbulance2dSphere = ambulanceIndexes.some(
      (idx) => idx[0].currentLocation === '2dsphere'
    );
    expect(hasAmbulance2dSphere).toBe(true);
  });
});

describe('2. Hospital Management CRUD & Real-Time Availability', () => {
  let createdHospitalId;

  it('should fetch list of hospitals with pagination', async () => {
    const res = await request(app)
      .get('/api/v1/hospitals?page=1&limit=3')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeLessThanOrEqual(3);
    expect(res.body.page).toBe(1);
    expect(res.body.totalPages).toBeDefined();
  });

  it('should fetch single hospital with virtual populated doctors and ambulances', async () => {
    const res = await request(app)
      .get(`/api/v1/hospitals/${seededHospital._id}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data._id).toBe(seededHospital._id.toString());
    expect(res.body.data.name).toBe(seededHospital.name);
    expect(Array.isArray(res.body.data.doctors)).toBe(true);
  });

  it('should create a new hospital with admin token', async () => {
    const res = await request(app)
      .post('/api/v1/hospitals')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        name: 'Fortis Memorial Research Institute',
        registrationNumber: `FMRI-${Date.now()}`,
        type: 'Super-Specialty',
        latitude: 28.4595,
        longitude: 77.0725,
        contactPhone: '+91 124 496 2200',
        emergencyHotline: '+91 124 1050 10',
        address: {
          street: 'Sector 44, Opposite HUDA City Centre',
          city: 'Gurugram',
          state: 'Haryana',
          postalCode: '122002',
        },
        facilities: ['ICU', 'NICU', 'Trauma Center'],
        specialties: ['Cardiology', 'Oncology', 'Neurosciences'],
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Fortis Memorial Research Institute');
    createdHospitalId = res.body.data._id;
  });

  it('should update hospital details', async () => {
    const res = await request(app)
      .put(`/api/v1/hospitals/${createdHospitalId}`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        contactPhone: '+91 124 496 9999',
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.contactPhone).toBe('+91 124 496 9999');
  });

  it('should update real-time bed and ICU availability', async () => {
    const res = await request(app)
      .patch(`/api/v1/hospitals/${createdHospitalId}/availability`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        availableIcuBeds: 35,
        availableOxygenBeds: 50,
        isEmergencyAccepting: true,
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.availableIcuBeds).toBe(35);
    expect(res.body.data.availableOxygenBeds).toBe(50);
  });

  it('should verify hospital credentials by Super Admin', async () => {
    const res = await request(app)
      .patch(`/api/v1/hospitals/${createdHospitalId}/verify`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ isVerified: true })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.isVerified).toBe(true);
  });

  it('should soft-delete hospital', async () => {
    const res = await request(app)
      .delete(`/api/v1/hospitals/${createdHospitalId}`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
  });
});

describe('3. Geolocation Search & Haversine Distance Calculation', () => {
  it('should discover nearby hospitals within radius with calculated distanceKm', async () => {
    // Near AIIMS Delhi: lat 28.5672, lng 77.2090
    const res = await request(app)
      .get('/api/v1/hospitals/nearby?lat=28.5672&lng=77.2090&radius=25')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.count).toBeGreaterThan(0);
    expect(res.body.data[0].distanceKm).toBeDefined();
    expect(res.body.data[0].distanceKm).toBeLessThanOrEqual(25);
  });

  it('should reject invalid coordinates with clear 400 JSON error', async () => {
    const res = await request(app)
      .get('/api/v1/hospitals/nearby?lat=999&lng=77.2090')
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Invalid latitude/i);
  });
});

describe('4. Emergency Services, 1-Tap Quick SOS & Dispatch', () => {
  it('should return aggregated 1-Tap SOS triage data', async () => {
    const res = await request(app)
      .get('/api/v1/emergency/quick-sos?lat=28.5672&lng=77.2090')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.sosSummary).toBeDefined();
    expect(Array.isArray(res.body.sosSummary.nearestHospitals)).toBe(true);
    expect(Array.isArray(res.body.sosSummary.nearestAmbulances)).toBe(true);
    expect(Array.isArray(res.body.sosSummary.urgentHelplines)).toBe(true);
  });

  it('should retrieve list of verified national and state helplines', async () => {
    const res = await request(app)
      .get('/api/v1/emergency/contacts')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.count).toBeGreaterThan(0);
  });

  it('should update ambulance dispatch status and GPS coordinates', async () => {
    const res = await request(app)
      .patch(`/api/v1/emergency/ambulances/${seededAmbulance._id}/status`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        status: 'on_call',
        latitude: 28.569,
        longitude: 77.21,
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('on_call');
  });
});

describe('5. Search & Multi-Filter APIs with Pagination', () => {
  it('should filter hospitals by city, specialty, and 24x7 acceptance', async () => {
    const res = await request(app)
      .get('/api/v1/hospitals/search?city=Delhi&specialty=Cardiology&is24x7=true&page=1&limit=5')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.count).toBeGreaterThan(0);
    expect(res.body.page).toBe(1);
    expect(res.body.totalPages).toBeDefined();
  });

  it('should search doctors by specialty and emergency duty availability', async () => {
    const res = await request(app)
      .get('/api/v1/doctors?specialization=Cardiology&isEmergencyAvailable=true&page=1&limit=5')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.count).toBeGreaterThan(0);
  });
});

describe('6. JWT Authentication, Hashing & Role-Based Access Control (RBAC)', () => {
  it('should register a new general user and issue JWT token', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Karan Mehra',
        email: `karan_${Date.now()}@testpharma.com`,
        password: 'KaranPassword123!',
        phone: '+91 98888 77777',
        role: 'user',
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.password).toBeUndefined();
  });

  it('should reject invalid password with 401', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@neerajpharma.com',
        password: 'WrongPassword!',
      })
      .expect(401);

    expect(res.body.success).toBe(false);
  });

  it('should block super_admin registration without admin secret (403)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Hacker Admin',
        email: `hacker_${Date.now()}@hack.com`,
        password: 'HackPassword123!',
        role: 'super_admin',
        adminSecret: 'invalid_secret_key',
      })
      .expect(403);

    expect(res.body.success).toBe(false);
  });

  it('should block unauthorized role from admin endpoints (403)', async () => {
    const res = await request(app)
      .get('/api/v1/admin/dashboard-stats')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403);

    expect(res.body.success).toBe(false);
  });

  it('should reject requests without authorization token (401)', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .expect(401);

    expect(res.body.success).toBe(false);
  });
});

describe('7. Admin Management & Health Metrics', () => {
  it('should return aggregated system metrics for super_admin', async () => {
    const res = await request(app)
      .get('/api/v1/admin/dashboard-stats')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.hospitals.total).toBeGreaterThan(0);
    expect(res.body.data.beds.totalBeds).toBeGreaterThan(0);
    expect(res.body.data.ambulances.total).toBeGreaterThan(0);
  });

  it('should list registered users with pagination', async () => {
    const res = await request(app)
      .get('/api/v1/admin/users?page=1&limit=5')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.total).toBeGreaterThan(0);
    expect(res.body.page).toBe(1);
  });
});

describe('8. Input Validation with Express-Validator', () => {
  it('should return 400 when creating hospital with missing required fields', async () => {
    const res = await request(app)
      .post('/api/v1/hospitals')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        // missing name, address, latitude, longitude
        type: 'Clinic',
      })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.errors).toBeDefined();
  });

  it('should return 400 when registering user with invalid email format', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Bad Email User',
        email: 'not-an-email',
        password: 'Password123!',
      })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.errors).toBeDefined();
  });
});

describe('9. Security Hardening (Helmet, Bcrypt, Env Secrets, CORS, Rate Limit)', () => {
  it('should return Helmet security headers', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBeDefined();
  });

  it('should verify CORS header is present', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['access-control-allow-origin']).toBeDefined();
  });

  it('should ensure password is never leaked and properly hashed with bcrypt', async () => {
    const user = await User.findOne({ email: 'admin@neerajpharma.com' });
    expect(user.password).toBeUndefined(); // select: false

    const userWithPass = await User.findOne({ email: 'admin@neerajpharma.com' }).select('+password');
    expect(userWithPass.password).toBeDefined();
    expect(userWithPass.password).not.toBe('AdminPassword123!');
    expect(userWithPass.password.startsWith('$2')).toBe(true); // bcrypt hash prefix
  });
});

describe('10. Interactive Documentation & Service Health Check', () => {
  it('should return 200 OK for /health endpoint with uptime and timestamp', async () => {
    const res = await request(app).get('/health').expect(200);
    expect(res.body.status).toBe('online');
    expect(res.body.timestamp).toBeDefined();
    expect(res.body.version).toBe('1.0.0');
  });

  it('should return 200 OK for /api/v1 API catalog root', async () => {
    const res = await request(app).get('/api/v1').expect(200);
    expect(res.body.name).toBeDefined();
    expect(res.body.endpoints).toBeDefined();
    expect(res.body.documentation).toBe('/api-docs');
  });

  it('should serve Swagger UI interactive documentation at /api-docs', async () => {
    const res = await request(app).get('/api-docs/');
    expect([200, 301]).toContain(res.status);
  });
});
