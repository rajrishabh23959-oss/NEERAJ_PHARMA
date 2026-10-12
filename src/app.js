const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

const rateLimit = require('express-rate-limit');

const { setupSwagger } = require('./config/swagger');
const errorHandler = require('./middleware/errorHandler');

// Route imports
const authRoutes = require('./routes/authRoutes');
const hospitalRoutes = require('./routes/hospitalRoutes');
const emergencyRoutes = require('./routes/emergencyRoutes');
const doctorRoutes = require('./routes/doctorRoutes');
const adminRoutes = require('./routes/adminRoutes');

// Fail-fast environment variable validation
const requiredEnvVars = ['JWT_SECRET', 'ADMIN_SECRET'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`CRITICAL CONFIGURATION ERROR: Missing required environment variable '${envVar}'.`);
  }
}

const app = express();

// Security Headers with Helmet including Content Security Policy (CSP)
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'https://images.unsplash.com', 'https:'],
        connectSrc: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

// Enable Cross-Origin Resource Sharing
app.use(
  cors({
    origin: process.env.CLIENT_URL || '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Rate Limiting Middleware (General API & Stricter Authentication Limits)
const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
  message: {
    success: false,
    message: 'Too many requests from this IP address. Please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
});

const authLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX, 10) || 20,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
});

// Apply rate limiters to API routes
app.use('/api', generalLimiter);

// Body Parser Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// HTTP Request Logger
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Serve Frontend Demo & Assets
app.use(express.static(path.join(__dirname, 'public')));

// Initialize Swagger Interactive API Documentation
setupSwagger(app);

// API Health Check & Root Info
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'online',
    timestamp: new Date().toISOString(),
    service: 'Neerajpharma Healthcare & Emergency Hospital Locator API',
    version: '1.0.0',
    uptime: `${Math.floor(process.uptime())} seconds`,
  });
});

app.get('/api/v1', (req, res) => {
  res.status(200).json({
    name: 'Neerajpharma Healthcare & Emergency Hospital Locator API',
    version: 'v1',
    documentation: '/api-docs',
    endpoints: {
      auth: '/api/v1/auth',
      hospitals: '/api/v1/hospitals',
      emergency: '/api/v1/emergency',
      doctors: '/api/v1/doctors',
      admin: '/api/v1/admin',
      health: '/health',
    },
  });
});

// Mount Application Routes
app.use('/api/v1/auth', authLimiter, authRoutes);
app.use('/api/v1/hospitals', hospitalRoutes);
app.use('/api/v1/emergency', emergencyRoutes);
app.use('/api/v1/doctors', doctorRoutes);
app.use('/api/v1/admin', adminRoutes);

// 404 Route Handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Resource not found at endpoint ${req.originalUrl}`,
  });
});

// Centralized Error Handling Middleware
app.use(errorHandler);

module.exports = app;
