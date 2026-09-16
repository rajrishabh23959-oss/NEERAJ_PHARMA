require('dotenv').config();
const http = require('http');
const app = require('./app');
const { connectDB, disconnectDB } = require('./config/db');
const Hospital = require('./models/Hospital');
const seedData = require('./seed/seeder');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // 1. Establish Database Connection
    await connectDB();

    // 2. Check if database has data; if empty, automatically run initial seed
    const hospitalCount = await Hospital.countDocuments();
    if (hospitalCount === 0) {
      console.log('📦 Database is currently empty. Running automated initial seed...');
      await seedData();
    }

    // 3. Start HTTP Server
    const server = http.createServer(app);
    server.listen(PORT, () => {
      console.log(`\n==========================================================`);
      console.log(`🚀 NEERAJPHARMA HEALTHCARE & EMERGENCY API SERVER RUNNING`);
      console.log(`==========================================================`);
      console.log(`🌐 Server Port:       http://localhost:${PORT}`);
      console.log(`📖 API Documentation: http://localhost:${PORT}/api-docs`);
      console.log(`🏥 Frontend Demo:     http://localhost:${PORT}`);
      console.log(`🩺 Health Endpoint:   http://localhost:${PORT}/health`);
      console.log(`==========================================================\n`);
    });

    // Graceful Shutdown Handlers
    const shutdown = async (signal) => {
      console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);
      server.close(async () => {
        await disconnectDB();
        console.log('✅ Server and database connections closed cleanly.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    process.on('unhandledRejection', (err) => {
      console.error('💥 Unhandled Rejection:', err);
    });

  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
};

startServer();
