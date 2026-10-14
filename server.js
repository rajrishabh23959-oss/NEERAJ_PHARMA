// Application Entry Point - Neeraj Pharma Healthcare & Emergency Hospital Locator
const http = require('http');
const path = require('path');
const express = require('express');
const cors = require('cors');
const config = require('./src/config/env');
const apiRouter = require('./src/routes/index');
const { notFoundHandler, errorHandler } = require('./src/middleware/errorHandler');
const { db } = require('./src/config/db');

const app = express();

// Global Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static Frontend Assets
const staticDir = path.resolve(__dirname, 'public');
app.use(express.static(staticDir));

// Mount REST API Routes
app.use('/api', apiRouter);

// Centralized 404 & Error Handling Middleware
app.use(notFoundHandler);
app.use(errorHandler);

const server = http.createServer(app);

if (require.main === module) {
  server.listen(config.PORT, () => {
    console.log(`================================================================`);
    console.log(` NEERAJ PHARMA HEALTHCARE & EMERGENCY HOSPITAL LOCATOR PLATFORM `);
    console.log(`================================================================`);
    console.log(` Server running on   : http://localhost:${config.PORT}`);
    console.log(` Web Frontend UI     : http://localhost:${config.PORT}`);
    console.log(` API Base Endpoint   : http://localhost:${config.PORT}/api`);
    console.log(` Health Check        : http://localhost:${config.PORT}/api/health`);
    console.log(` Environment         : ${config.NODE_ENV}`);
    console.log(` Total Hospitals     : ${db.count('hospitals')} (${db.count('hospitals', h => h.verified)} verified)`);
    console.log(` Total Doctors       : ${db.count('doctors')}`);
    console.log(` Mapped Locations    : ${db.count('locations')}`);
    console.log(` Active Ambulances   : ${db.count('ambulances', a => a.status === 'Available')}`);
    console.log(`================================================================`);
  });
}

module.exports = { app, server, appRouter: app };
