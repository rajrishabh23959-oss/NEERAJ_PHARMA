const mongoose = require('mongoose');

let mongoMemoryServer = null;

const connectDB = async () => {
  const uri = process.env.MONGO_URI;

  // Set mongoose options
  mongoose.set('strictQuery', false);

  if (uri && uri !== 'inmemory') {
    try {
      console.log(`📡 Connecting to MongoDB at ${uri.replace(/:([^:@]{4})[^:@]*@/, ':****@')}...`);
      const conn = await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 3000,
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
    const { MongoMemoryServer } = require('mongodb-memory-server');
    console.log('📦 Launching embedded MongoDB (v4.4.24)...');
    mongoMemoryServer = await MongoMemoryServer.create({
      binary: {
        version: '4.4.24',
      },
    });
    const memUri = mongoMemoryServer.getUri();
    const conn = await mongoose.connect(memUri);
    console.log(`✅ Embedded MongoDB Memory Server started at ${memUri}`);
    return conn;
  } catch (error) {
    console.error(`❌ Critical: Failed to start database connection: ${error.message}`);
    process.exit(1);
  }
};

const disconnectDB = async () => {
  try {
    await mongoose.connection.close();
    if (mongoMemoryServer) {
      await mongoMemoryServer.stop();
    }
  } catch (err) {
    console.error('Error disconnecting DB:', err);
  }
};

module.exports = { connectDB, disconnectDB };
