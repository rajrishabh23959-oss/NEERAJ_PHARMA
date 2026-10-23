// Unified Database Layer: Supports MongoDB (Mongoose), PostgreSQL (pg), and Embedded Store
const fs = require('fs');
const path = require('path');
const config = require('./env');
const { getSeedData } = require('./seedData');
const { connectMongoDB } = require('./mongodb');
const { pool, initPostgresSchema } = require('./postgres');

// Load Mongoose Models
const HospitalModel = require('../models/Hospital');
const DoctorModel = require('../models/Doctor');
const EmergencyContactModel = require('../models/EmergencyContact');
const AmbulanceModel = require('../models/Ambulance');
const LocationModel = require('../models/Location');
const UserModel = require('../models/User');
const DispatchModel = require('../models/Dispatch');

class DatabaseEngine {
  constructor(filePath) {
    this.filePath = filePath;
    this.dialect = config.DB_DIALECT;
    this.models = {
      hospitals: HospitalModel,
      doctors: DoctorModel,
      emergency_contacts: EmergencyContactModel,
      ambulances: AmbulanceModel,
      locations: LocationModel,
      users: UserModel,
      emergency_dispatches: DispatchModel
    };
    this.data = null;
    this.isExternal = false;
    this.ensureInitialized();
  }

  async connectExternal() {
    if (this.dialect === 'postgresql' || this.dialect === 'postgres') {
      try {
        await initPostgresSchema();
        this.isExternal = true;
        const res = await pool.query('SELECT COUNT(*) FROM hospitals');
        const count = parseInt(res.rows[0].count, 10);
        if (count === 0) {
          await this.seedPostgres();
        }
        await this.hydrateFromPostgres();
        console.log(`[DatabaseEngine] Connected to PostgreSQL. Hydrated ${this.count('hospitals')} hospitals.`);
        return true;
      } catch (err) {
        console.warn(`[DatabaseEngine] PostgreSQL connection failed: ${err.message}. Falling back to embedded JSON store.`);
        this.isExternal = false;
        return false;
      }
    } else if (this.dialect === 'mongodb') {
      try {
        await connectMongoDB();
        this.isExternal = true;
        const count = await this.models.hospitals.countDocuments();
        if (count === 0) {
          await this.seedMongoDB();
        }
        await this.hydrateFromMongoDB();
        console.log(`[DatabaseEngine] Connected to MongoDB. Hydrated ${this.count('hospitals')} hospitals.`);
        return true;
      } catch (err) {
        console.warn(`[DatabaseEngine] MongoDB connection failed: ${err.message}. Falling back to embedded JSON store.`);
        this.isExternal = false;
        return false;
      }
    }
    return false;
  }

  async seedMongoDB() {
    const seed = getSeedData();
    for (const [key, model] of Object.entries(this.models)) {
      if (seed[key] && seed[key].length > 0) {
        await model.deleteMany({});
        await model.insertMany(seed[key]);
      }
    }
  }

  async hydrateFromMongoDB() {
    for (const [key, model] of Object.entries(this.models)) {
      const records = await model.find().lean();
      if (records && records.length > 0) {
        this.data[key] = records.map(r => {
          const doc = { ...r };
          delete doc._id;
          delete doc.__v;
          return doc;
        });
      }
    }
    this.persistSync();
  }

  async seedPostgres() {
    const seed = getSeedData();
    // Seed locations
    for (const loc of seed.locations || []) {
      await pool.query(
        `INSERT INTO locations (id, city_name, state, address, postal_code, latitude, longitude, key_area, zone_type, hospital_count, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (id) DO NOTHING`,
        [loc.id, loc.cityName, loc.state, loc.address, loc.postalCode, loc.latitude, loc.longitude, loc.keyArea, loc.zoneType, loc.hospitalCount, loc.createdAt || new Date()]
      );
    }
    // Seed hospitals
    for (const h of seed.hospitals || []) {
      await pool.query(
        `INSERT INTO hospitals (id, location_id, name, address, city, state, postal_code, latitude, longitude, phone, emergency_hotline, email, facility_type, operating_hours, open_time, close_time, open_24x7, has_emergency, total_beds, available_beds, icu_beds_available, ventilator_beds_available, specialties, services, rating, verified, verified_at, verified_by, verification_notes, website, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31)
         ON CONFLICT (id) DO NOTHING`,
        [
          h.id, h.locationId, h.name, h.address, h.city, h.state, h.postalCode, h.latitude, h.longitude,
          h.phone, h.emergencyHotline, h.email, h.facilityType, h.operatingHours,
          h.operatingSchedule ? h.operatingSchedule.openTime : '00:00',
          h.operatingSchedule ? h.operatingSchedule.closeTime : '23:59',
          h.open24x7, h.hasEmergency, h.totalBeds, h.availableBeds, h.icuBedsAvailable, h.ventilatorBedsAvailable,
          JSON.stringify(h.specialties || []), JSON.stringify(h.services || []), h.rating,
          h.verified, h.verifiedAt, h.verifiedBy, h.verificationNotes, h.website, h.createdAt || new Date()
        ]
      );
    }
  }

  async hydrateFromPostgres() {
    try {
      const locRes = await pool.query('SELECT * FROM locations');
      if (locRes.rows.length > 0) {
        this.data.locations = locRes.rows.map(r => ({
          id: r.id,
          cityName: r.city_name,
          state: r.state,
          address: r.address,
          postalCode: r.postal_code,
          latitude: parseFloat(r.latitude),
          longitude: parseFloat(r.longitude),
          keyArea: r.key_area,
          zoneType: r.zone_type,
          hospitalCount: r.hospital_count,
          createdAt: r.created_at
        }));
      }
      const hospRes = await pool.query('SELECT * FROM hospitals');
      if (hospRes.rows.length > 0) {
        this.data.hospitals = hospRes.rows.map(r => ({
          id: r.id,
          locationId: r.location_id,
          name: r.name,
          address: r.address,
          city: r.city,
          state: r.state,
          postalCode: r.postal_code,
          latitude: parseFloat(r.latitude),
          longitude: parseFloat(r.longitude),
          phone: r.phone,
          emergencyHotline: r.emergency_hotline,
          email: r.email,
          facilityType: r.facility_type,
          operatingHours: r.operating_hours,
          operatingSchedule: {
            openTime: r.open_time || '00:00',
            closeTime: r.close_time || '23:59',
            days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
          },
          open24x7: r.open_24x7,
          hasEmergency: r.has_emergency,
          totalBeds: r.total_beds,
          availableBeds: r.available_beds,
          icuBedsAvailable: r.icu_beds_available,
          ventilatorBedsAvailable: r.ventilator_beds_available,
          specialties: typeof r.specialties === 'string' ? JSON.parse(r.specialties) : r.specialties,
          services: typeof r.services === 'string' ? JSON.parse(r.services) : r.services,
          rating: parseFloat(r.rating),
          verified: r.verified,
          verifiedAt: r.verified_at,
          verifiedBy: r.verified_by,
          verificationNotes: r.verification_notes,
          website: r.website,
          createdAt: r.created_at
        }));
      }
      this.persistSync();
    } catch (err) {
      console.warn(`[DatabaseEngine] Error hydrating from PostgreSQL: ${err.message}`);
    }
  }

  ensureInitialized() {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (!fs.existsSync(this.filePath)) {
      this.seedDatabase();
    } else {
      try {
        const raw = fs.readFileSync(this.filePath, 'utf8');
        this.data = JSON.parse(raw);
        if (!this.data.locations || !this.data.emergency_contacts) {
          this.seedDatabase();
        }
      } catch (err) {
        this.seedDatabase();
      }
    }
  }

  seedDatabase() {
    this.data = getSeedData();
    this.persistSync();
    if (this.isExternal) {
      if (this.dialect === 'mongodb') {
        this.seedMongoDB().catch(err => console.error('[DatabaseEngine] Mongo reseed error:', err.message));
      } else if (this.dialect === 'postgresql' || this.dialect === 'postgres') {
        this.seedPostgres().catch(err => console.error('[DatabaseEngine] Postgres reseed error:', err.message));
      }
    }
    return this.data;
  }

  persistSync() {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const tempFile = `${this.filePath}.tmp.${process.pid}.${Date.now()}`;
    fs.writeFileSync(tempFile, JSON.stringify(this.data, null, 2), 'utf8');
    fs.renameSync(tempFile, this.filePath);
  }

  getCollection(name) {
    if (!this.data[name]) {
      this.data[name] = [];
    }
    return this.data[name];
  }

  find(collectionName, queryFn = null) {
    const col = this.getCollection(collectionName);
    if (!queryFn) return [...col];
    return col.filter(queryFn);
  }

  findById(collectionName, id) {
    const col = this.getCollection(collectionName);
    return col.find(item => item.id === id) || null;
  }

  findOne(collectionName, queryFn) {
    const col = this.getCollection(collectionName);
    return col.find(queryFn) || null;
  }

  create(collectionName, item) {
    const col = this.getCollection(collectionName);
    const prefix = collectionName.slice(0, 4);
    const newItem = {
      ...item,
      id: item.id || `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      createdAt: item.createdAt || new Date().toISOString()
    };
    col.push(newItem);
    this.persistSync();

    if (this.isExternal && this.models[collectionName]) {
      if (this.dialect === 'mongodb') {
        this.models[collectionName].create(newItem).catch(err => {
          console.error(`[DatabaseEngine] Mongo insert error on ${collectionName}:`, err.message);
        });
      }
    }

    return newItem;
  }

  updateById(collectionName, id, updates) {
    const col = this.getCollection(collectionName);
    const index = col.findIndex(item => item.id === id);
    if (index === -1) return null;

    col[index] = {
      ...col[index],
      ...updates,
      id: col[index].id, // Prevent accidental ID overwrite
      updatedAt: new Date().toISOString()
    };
    this.persistSync();

    if (this.isExternal && this.models[collectionName]) {
      if (this.dialect === 'mongodb') {
        this.models[collectionName].findOneAndUpdate({ id }, { $set: updates }).catch(err => {
          console.error(`[DatabaseEngine] Mongo update error on ${collectionName}:`, err.message);
        });
      }
    }

    return col[index];
  }

  deleteById(collectionName, id) {
    const col = this.getCollection(collectionName);
    const index = col.findIndex(item => item.id === id);
    if (index === -1) return false;

    col.splice(index, 1);
    this.persistSync();

    if (this.isExternal && this.models[collectionName]) {
      if (this.dialect === 'mongodb') {
        this.models[collectionName].deleteOne({ id }).catch(err => {
          console.error(`[DatabaseEngine] Mongo delete error on ${collectionName}:`, err.message);
        });
      }
    }

    return true;
  }

  count(collectionName, queryFn = null) {
    return this.find(collectionName, queryFn).length;
  }
}

const dbInstance = new DatabaseEngine(config.DB_FILE);

module.exports = {
  db: dbInstance,
  pool,
  models: dbInstance.models,
  seedDatabase: () => dbInstance.seedDatabase()
};
