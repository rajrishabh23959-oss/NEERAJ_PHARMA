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
    this.ensureInitialized();
  }

  async connectExternal() {
    if (this.dialect === 'postgresql') {
      await initPostgresSchema();
    } else {
      await connectMongoDB();
    }
    return true;
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
    return col[index];
  }

  deleteById(collectionName, id) {
    const col = this.getCollection(collectionName);
    const index = col.findIndex(item => item.id === id);
    if (index === -1) return false;

    col.splice(index, 1);
    this.persistSync();
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
