const swaggerUi = require('swagger-ui-express');

const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'Neerajpharma Healthcare & Emergency Hospital Locator API',
    version: '1.0.0',
    description: `
      Robust RESTful backend service for the **Neerajpharma Responsive Healthcare & Emergency HospitalLocator Website**.
      
      ### Core Features:
      - **Location-Based Services**: Discover nearby hospitals within an adjustable radius using MongoDB 2dsphere indexing and the Haversine formula.
      - **Hospital Management**: Complete lifecycle APIs for hospitals, bed availability (ICU, Oxygen, General), and facilities.
      - **Emergency & SOS**: 1-Tap Quick SOS aggregator, national & city helplines, real-time ambulance dispatch.
      - **Doctor Directory**: Specialties, consultations, emergency duty rosters.
      - **Authentication & RBAC**: JWT Bearer tokens with User, Hospital Admin, and Super Admin permissions.
    `,
    contact: {
      name: 'Neerajpharma Backend Support',
      email: 'backend@neerajpharma.com',
    },
  },
  servers: [
    {
      url: 'http://localhost:5000',
      description: 'Local Development Server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
  paths: {
    '/api/v1/emergency/quick-sos': {
      get: {
        tags: ['Emergency & SOS'],
        summary: '1-Tap Quick SOS Aggregator',
        description: 'Instantly returns the nearest emergency-accepting hospitals with available ICU beds, available ambulances, and national emergency helplines.',
        parameters: [
          { name: 'lat', in: 'query', schema: { type: 'number' }, description: 'User latitude (e.g. 28.6139)' },
          { name: 'lng', in: 'query', schema: { type: 'number' }, description: 'User longitude (e.g. 77.2090)' },
          { name: 'city', in: 'query', schema: { type: 'string' }, description: 'Optional city fallback' },
        ],
        responses: {
          200: { description: 'Successful SOS triage data' },
        },
      },
    },
    '/api/v1/hospitals/nearby': {
      get: {
        tags: ['Hospitals & Locator'],
        summary: 'Find Nearby Hospitals by Geolocation',
        parameters: [
          { name: 'lat', in: 'query', required: true, schema: { type: 'number' }, description: 'Latitude' },
          { name: 'lng', in: 'query', required: true, schema: { type: 'number' }, description: 'Longitude' },
          { name: 'radius', in: 'query', schema: { type: 'number', default: 15 }, description: 'Search radius in Kilometers' },
          { name: 'specialty', in: 'query', schema: { type: 'string' }, description: 'Filter by specialty (e.g. Cardiology)' },
          { name: 'facility', in: 'query', schema: { type: 'string' }, description: 'Filter by facility (e.g. ICU, Blood Bank)' },
          { name: 'hasIcu', in: 'query', schema: { type: 'boolean' }, description: 'Must have available ICU beds' },
          { name: 'hasOxygen', in: 'query', schema: { type: 'boolean' }, description: 'Must have available Oxygen beds' },
        ],
        responses: {
          200: { description: 'List of nearby hospitals sorted by distance' },
        },
      },
    },
    '/api/v1/hospitals/search': {
      get: {
        tags: ['Hospitals & Locator'],
        summary: 'Search & Multi-Filter Hospitals',
        parameters: [
          { name: 'q', in: 'query', schema: { type: 'string' }, description: 'Keyword search' },
          { name: 'city', in: 'query', schema: { type: 'string' } },
          { name: 'type', in: 'query', schema: { type: 'string' } },
          { name: 'specialty', in: 'query', schema: { type: 'string' } },
          { name: 'is24x7', in: 'query', schema: { type: 'boolean' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
        ],
        responses: {
          200: { description: 'Paginated hospital search results' },
        },
      },
    },
    '/api/v1/hospitals/{id}/availability': {
      patch: {
        tags: ['Hospitals & Locator'],
        summary: 'Real-time Hospital Bed & ICU Availability Update',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  availableBeds: { type: 'number' },
                  availableIcuBeds: { type: 'number' },
                  availableOxygenBeds: { type: 'number' },
                  isEmergencyAccepting: { type: 'boolean' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Availability updated' },
        },
      },
    },
    '/api/v1/emergency/ambulances': {
      get: {
        tags: ['Emergency & SOS'],
        summary: 'Find Ambulances (Nearby or by City)',
        parameters: [
          { name: 'lat', in: 'query', schema: { type: 'number' } },
          { name: 'lng', in: 'query', schema: { type: 'number' } },
          { name: 'radius', in: 'query', schema: { type: 'number', default: 25 } },
          { name: 'city', in: 'query', schema: { type: 'string' } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['available', 'on_call'] } },
        ],
        responses: {
          200: { description: 'List of ambulances' },
        },
      },
    },
    '/api/v1/emergency/contacts': {
      get: {
        tags: ['Emergency & SOS'],
        summary: 'Get Emergency Helplines & Contacts',
        parameters: [
          { name: 'city', in: 'query', schema: { type: 'string' } },
          { name: 'category', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'List of emergency contacts' },
        },
      },
    },
    '/api/v1/auth/register': {
      post: {
        tags: ['Authentication & Users'],
        summary: 'Register a New User',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email', 'password'],
                properties: {
                  name: { type: 'string' },
                  email: { type: 'string' },
                  password: { type: 'string' },
                  phone: { type: 'string' },
                  role: { type: 'string', enum: ['user', 'hospital_admin'] },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'User registered with JWT' },
        },
      },
    },
    '/api/v1/auth/login': {
      post: {
        tags: ['Authentication & Users'],
        summary: 'Authenticate User & Obtain JWT',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string' },
                  password: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Authenticated with token' },
        },
      },
    },
    '/api/v1/admin/dashboard-stats': {
      get: {
        tags: ['Admin Management'],
        summary: 'Get System-Wide Dashboard Metrics',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Aggregated healthcare system metrics' },
        },
      },
    },
  },
};

const setupSwagger = (app) => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
  console.log('📖 Swagger API Documentation initialized at /api-docs');
};

module.exports = { setupSwagger, swaggerDocument };
