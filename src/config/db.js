const mongoose = require('mongoose');

let mongoMemoryServer = null;
let cachedUri = null;

const connectDB = async () => {
  // If already connected, return existing connection
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  // Set mongoose options
  mongoose.set('strictQuery', false);

  const uri = process.env.MONGO_URI;

  if (uri && uri !== 'inmemory') {
    try {
      console.log(`📡 Connecting to MongoDB at ${uri.replace(/:([^:@]{4})[^:@]*@/, ':****@')}...`);
      const conn = await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 3000,
        runtimeAdapters: { os: require('os') },
      });
      console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
      return conn;
    } catch (err) {
      console.warn(`⚠️ Could not connect to external MongoDB (${err.message}).`);
      console.log('🔄 Falling back to embedded MongoDB Memory Server for seamless local execution...');
    }
  }

  // Fallback to MongoMemoryServer
  try {
    if (!mongoMemoryServer) {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      console.log('📦 Launching embedded MongoDB (v4.4.24)...');
      mongoMemoryServer = await MongoMemoryServer.create({
        binary: {
          version: '4.4.24',
        },
      });
      cachedUri = mongoMemoryServer.getUri();
      console.log(`✅ Embedded MongoDB Memory Server started at ${cachedUri}`);
    }

    const conn = await mongoose.connect(cachedUri, {
      runtimeAdapters: { os: require('os') },
    });
    return conn;
  } catch (error) {
    console.error(`❌ Critical: Failed to start database connection: ${error.message}`);
    throw error;
  }
};

const disconnectDB = async () => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
    if (mongoMemoryServer) {
      await mongoMemoryServer.stop();
      mongoMemoryServer = null;
      cachedUri = null;
    }
  } catch (err) {
    console.error('Error disconnecting DB:', err);
  }
};

module.exports = { connectDB, disconnectDB };
