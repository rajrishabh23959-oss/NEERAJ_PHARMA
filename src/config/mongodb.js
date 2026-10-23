// MongoDB Mongoose Connection Manager
const mongoose = require('mongoose');
const config = require('./env');

async function connectMongoDB() {
  const conn = await mongoose.connect(config.MONGODB_URI);
  return conn;
}

module.exports = {
  connectMongoDB,
  mongoose
};
