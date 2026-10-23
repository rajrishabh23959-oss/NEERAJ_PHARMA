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

// Disable X-Powered-By
if (typeof app.disable !== 'function') {
  app.disable = (k) => app.set(k, false);
}
app.disable('x-powered-by');

// Security Headers Middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '0');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' https://unpkg.com; style-src 'self' 'unsafe-inline' https://unpkg.com https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: https://*.tile.openstreetmap.org https://unpkg.com; connect-src 'self' https://*.tile.openstreetmap.org;"
  );
  next();
});

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

async function startServer() {
  if (config.DB_DIALECT !== 'embedded') {
    try {
      await db.connectExternal();
    } catch (err) {
      console.warn(`[DatabaseEngine] External database connection warning: ${err.message}. Running on embedded store.`);
    }
  }

  server.listen(config.PORT, () => {
    console.log(`================================================================`);
    console.log(` NEERAJ PHARMA HEALTHCARE & EMERGENCY HOSPITAL LOCATOR PLATFORM `);
    console.log(`================================================================`);
    console.log(` Server running on   : http://localhost:${config.PORT}`);
    console.log(` Web Frontend UI     : http://localhost:${config.PORT}`);
    console.log(` API Base Endpoint   : http://localhost:${config.PORT}/api`);
    console.log(` Health Check        : http://localhost:${config.PORT}/api/health`);
    console.log(` Environment         : ${config.NODE_ENV}`);
    console.log(` Database Dialect    : ${config.DB_DIALECT}`);
    console.log(` Total Hospitals     : ${db.count('hospitals')} (${db.count('hospitals', h => h.verified)} verified)`);
    console.log(` Total Doctors       : ${db.count('doctors')}`);
    console.log(` Mapped Locations    : ${db.count('locations')}`);
    console.log(` Active Ambulances   : ${db.count('ambulances', a => a.status === 'Available')}`);
    console.log(`================================================================`);
  });
}

if (require.main === module) {
  startServer();
}

module.exports = { app, server, appRouter: app, startServer };
