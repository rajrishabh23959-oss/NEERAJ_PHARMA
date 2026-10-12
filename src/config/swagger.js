const swaggerUi = require('swagger-ui-express');

const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'Neerajpharma Healthcare & Emergency Hospital Locator API',
    version: '1.0.0',
    description: `
      Robust RESTful backend service for the **Neerajpharma Responsive Healthcare & Emergency HospitalLocator Website**.
      
      ### Core Architectural Pillars:
      - **Location-Based Services**: Discover nearby hospitals and ambulances using MongoDB 2dsphere indexing and great-circle Haversine calculations.
      - **Hospital Management**: Complete lifecycle CRUD for hospitals, real-time bed and ICU availability tracking.
      - **Emergency & SOS**: 1-Tap Quick SOS triage aggregator, ambulance fleet tracking, national and city helplines.
      - **Doctor Directory**: Specialties, consultations, and emergency duty rosters.
      - **Authentication & RBAC**: JWT Bearer authentication with User, Hospital Admin, and Super Admin roles.
      - **Security Hardening**: Helmet security headers, rate limiting (DDoS & brute force prevention), bcrypt password hashing, and CORS protection.
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
    '/health': {
      get: {
        tags: ['System & Health'],
        summary: 'Service Health Check',
        responses: {
          200: { description: 'Service is operational' },
        },
      },
    },
    '/api/v1': {
      get: {
        tags: ['System & Health'],
        summary: 'API Root & Available Endpoints',
        responses: {
          200: { description: 'API sitemap and endpoint inventory' },
        },
      },
    },
    '/api/v1/auth/register': {
      post: {
        tags: ['Authentication & Users'],
        summary: 'Register a New User',
        requestBody: {
          required: true,
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
                  role: { type: 'string', enum: ['user', 'hospital_admin', 'super_admin'] },
                  adminSecret: { type: 'string', description: 'Required only when registering as super_admin' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'User registered successfully with JWT' },
          400: { description: 'Validation error or email exists' },
          403: { description: 'Invalid admin secret for role escalation' },
        },
      },
    },
    '/api/v1/auth/login': {
      post: {
        tags: ['Authentication & Users'],
        summary: 'Authenticate User & Obtain JWT',
        requestBody: {
          required: true,
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
          200: { description: 'Authenticated with JWT token' },
          401: { description: 'Invalid credentials' },
        },
      },
    },
    '/api/v1/auth/me': {
      get: {
        tags: ['Authentication & Users'],
        summary: 'Get Current Authenticated Profile',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Current user profile details' },
          401: { description: 'Unauthorized' },
        },
      },
    },
    '/api/v1/auth/updatedetails': {
      put: {
        tags: ['Authentication & Users'],
        summary: 'Update User Profile Details',
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  phone: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Profile updated' },
        },
      },
    },
    '/api/v1/auth/updatepassword': {
      put: {
        tags: ['Authentication & Users'],
        summary: 'Update Account Password',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['currentPassword', 'newPassword'],
                properties: {
                  currentPassword: { type: 'string' },
                  newPassword: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Password updated' },
          401: { description: 'Current password incorrect' },
        },
      },
    },
    '/api/v1/auth/saved-hospitals/{hospitalId}': {
      post: {
        tags: ['Authentication & Users'],
        summary: 'Bookmark Hospital to Favorites',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'hospitalId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Hospital added to favorites' },
        },
      },
      delete: {
        tags: ['Authentication & Users'],
        summary: 'Remove Hospital from Favorites',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'hospitalId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Hospital removed from favorites' },
        },
      },
    },
    '/api/v1/hospitals/nearby': {
      get: {
        tags: ['Hospitals & Locator'],
        summary: 'Find Nearby Hospitals by Geolocation',
        parameters: [
          { name: 'lat', in: 'query', required: true, schema: { type: 'number' }, description: 'Latitude (-90 to 90)' },
          { name: 'lng', in: 'query', required: true, schema: { type: 'number' }, description: 'Longitude (-180 to 180)' },
          { name: 'radius', in: 'query', schema: { type: 'number', default: 15 }, description: 'Search radius in Kilometers' },
          { name: 'specialty', in: 'query', schema: { type: 'string' }, description: 'Filter by specialty (e.g. Cardiology)' },
          { name: 'facility', in: 'query', schema: { type: 'string' }, description: 'Filter by facility (e.g. ICU, Blood Bank)' },
          { name: 'hasIcu', in: 'query', schema: { type: 'boolean' }, description: 'Must have available ICU beds' },
          { name: 'hasOxygen', in: 'query', schema: { type: 'boolean' }, description: 'Must have available Oxygen beds' },
          { name: 'is24x7', in: 'query', schema: { type: 'boolean' } },
        ],
        responses: {
          200: { description: 'List of nearby hospitals sorted by distance' },
          400: { description: 'Invalid coordinate values' },
        },
      },
    },
    '/api/v1/hospitals/search': {
      get: {
        tags: ['Hospitals & Locator'],
        summary: 'Search & Multi-Filter Hospitals',
        parameters: [
          { name: 'q', in: 'query', schema: { type: 'string' }, description: 'Keyword query' },
          { name: 'city', in: 'query', schema: { type: 'string' } },
          { name: 'state', in: 'query', schema: { type: 'string' } },
          { name: 'type', in: 'query', schema: { type: 'string' } },
          { name: 'specialty', in: 'query', schema: { type: 'string' } },
          { name: 'facility', in: 'query', schema: { type: 'string' } },
          { name: 'minBeds', in: 'query', schema: { type: 'integer' } },
          { name: 'isVerified', in: 'query', schema: { type: 'boolean' } },
          { name: 'is24x7', in: 'query', schema: { type: 'boolean' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
          { name: 'sortBy', in: 'query', schema: { type: 'string', default: 'rating' } },
          { name: 'sortOrder', in: 'query', schema: { type: 'string', default: 'desc' } },
        ],
        responses: {
          200: { description: 'Paginated hospital search results' },
        },
      },
    },
    '/api/v1/hospitals': {
      get: {
        tags: ['Hospitals & Locator'],
        summary: 'Get All Active Hospitals (Paginated)',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
        ],
        responses: {
          200: { description: 'Paginated hospital list' },
        },
      },
      post: {
        tags: ['Hospitals & Locator'],
        summary: 'Create New Hospital (Admin / Hospital Admin)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'address', 'latitude', 'longitude', 'contactPhone', 'emergencyHotline'],
                properties: {
                  name: { type: 'string' },
                  type: { type: 'string' },
                  latitude: { type: 'number' },
                  longitude: { type: 'number' },
                  contactPhone: { type: 'string' },
                  emergencyHotline: { type: 'string' },
                  address: {
                    type: 'object',
                    properties: {
                      street: { type: 'string' },
                      city: { type: 'string' },
                      state: { type: 'string' },
                      postalCode: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Hospital created' },
          400: { description: 'Validation failed' },
          403: { description: 'Forbidden' },
        },
      },
    },
    '/api/v1/hospitals/{id}': {
      get: {
        tags: ['Hospitals & Locator'],
        summary: 'Get Single Hospital Profile by ID',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Hospital details with virtual populated doctors and ambulances' },
          404: { description: 'Hospital not found' },
        },
      },
      put: {
        tags: ['Hospitals & Locator'],
        summary: 'Update Hospital Details',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: { type: 'object' },
            },
          },
        },
        responses: {
          200: { description: 'Hospital updated' },
          403: { description: 'Unauthorized' },
          404: { description: 'Hospital not found' },
        },
      },
      delete: {
        tags: ['Hospitals & Locator'],
        summary: 'Soft-Delete Hospital (Super Admin)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Hospital deactivated' },
          403: { description: 'Super Admin access required' },
        },
      },
    },
    '/api/v1/hospitals/{id}/availability': {
      patch: {
        tags: ['Hospitals & Locator'],
        summary: 'Real-Time Bed & ICU Availability Update',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  availableBeds: { type: 'number' },
                  availableIcuBeds: { type: 'number' },
                  availableOxygenBeds: { type: 'number' },
                  isEmergencyAccepting: { type: 'boolean' },
                  ambulanceCount: { type: 'number' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Hospital availability updated in real-time' },
          404: { description: 'Hospital not found' },
        },
      },
    },
    '/api/v1/hospitals/{id}/verify': {
      patch: {
        tags: ['Hospitals & Locator'],
        summary: 'Verify Hospital Credentials (Super Admin)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  isVerified: { type: 'boolean' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Hospital verification updated' },
        },
      },
    },
    '/api/v1/emergency/quick-sos': {
      get: {
        tags: ['Emergency & SOS'],
        summary: '1-Tap Quick SOS Emergency Aggregator',
        description: 'Instantly returns nearest emergency-accepting hospitals with available ICU beds, available ambulances within radius, and national emergency helplines.',
        parameters: [
          { name: 'lat', in: 'query', schema: { type: 'number' }, description: 'User latitude (e.g. 28.5672)' },
          { name: 'lng', in: 'query', schema: { type: 'number' }, description: 'User longitude (e.g. 77.2090)' },
          { name: 'city', in: 'query', schema: { type: 'string' }, description: 'Fallback city' },
        ],
        responses: {
          200: { description: 'Triage payload with nearest hospitals, ambulances, and helplines' },
        },
      },
    },
    '/api/v1/emergency/contacts': {
      get: {
        tags: ['Emergency & SOS'],
        summary: 'Get Emergency Helplines & Contacts',
        parameters: [
          { name: 'category', in: 'query', schema: { type: 'string' } },
          { name: 'city', in: 'query', schema: { type: 'string' } },
          { name: 'level', in: 'query', schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer' } },
          { name: 'limit', in: 'query', schema: { type: 'integer' } },
        ],
        responses: {
          200: { description: 'List of emergency contacts' },
        },
      },
      post: {
        tags: ['Emergency & SOS'],
        summary: 'Create Emergency Helpline (Super Admin)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['category', 'title', 'number'],
                properties: {
                  category: { type: 'string' },
                  title: { type: 'string' },
                  number: { type: 'string' },
                  alternateNumber: { type: 'string' },
                  level: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Emergency contact created' },
        },
      },
    },
    '/api/v1/emergency/contacts/{id}': {
      put: {
        tags: ['Emergency & SOS'],
        summary: 'Update Emergency Helpline (Super Admin)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Helpline updated' },
        },
      },
      delete: {
        tags: ['Emergency & SOS'],
        summary: 'Delete Emergency Helpline (Super Admin)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Helpline deleted' },
        },
      },
    },
    '/api/v1/emergency/ambulances': {
      get: {
        tags: ['Emergency & SOS'],
        summary: 'Find Ambulances (GPS Nearby or Filter)',
        parameters: [
          { name: 'lat', in: 'query', schema: { type: 'number' } },
          { name: 'lng', in: 'query', schema: { type: 'number' } },
          { name: 'radius', in: 'query', schema: { type: 'number', default: 25 } },
          { name: 'city', in: 'query', schema: { type: 'string' } },
          { name: 'status', in: 'query', schema: { type: 'string' } },
          { name: 'type', in: 'query', schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer' } },
          { name: 'limit', in: 'query', schema: { type: 'integer' } },
        ],
        responses: {
          200: { description: 'Ambulance list' },
        },
      },
      post: {
        tags: ['Emergency & SOS'],
        summary: 'Register Ambulance (Admin / Hospital Admin)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['vehicleNumber', 'providerName', 'driverName', 'contactNumber', 'city', 'latitude', 'longitude'],
                properties: {
                  vehicleNumber: { type: 'string' },
                  type: { type: 'string' },
                  providerName: { type: 'string' },
                  driverName: { type: 'string' },
                  contactNumber: { type: 'string' },
                  city: { type: 'string' },
                  latitude: { type: 'number' },
                  longitude: { type: 'number' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Ambulance registered' },
        },
      },
    },
    '/api/v1/emergency/ambulances/{id}/status': {
      patch: {
        tags: ['Emergency & SOS'],
        summary: 'Update Ambulance Status & GPS Coordinates',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string', enum: ['available', 'on_call', 'dispatched', 'maintenance'] },
                  latitude: { type: 'number' },
                  longitude: { type: 'number' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Ambulance status updated' },
        },
      },
    },
    '/api/v1/doctors': {
      get: {
        tags: ['Doctors Directory'],
        summary: 'List Doctors with Multi-Filter & Pagination',
        parameters: [
          { name: 'hospitalId', in: 'query', schema: { type: 'string' } },
          { name: 'specialization', in: 'query', schema: { type: 'string' } },
          { name: 'isEmergencyAvailable', in: 'query', schema: { type: 'boolean' } },
          { name: 'city', in: 'query', schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
        ],
        responses: {
          200: { description: 'Paginated list of doctors' },
        },
      },
      post: {
        tags: ['Doctors Directory'],
        summary: 'Add Doctor to Hospital (Admin / Hospital Admin)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['hospital', 'name', 'specialization', 'qualification'],
                properties: {
                  hospital: { type: 'string' },
                  name: { type: 'string' },
                  specialization: { type: 'string' },
                  qualification: { type: 'string' },
                  department: { type: 'string' },
                  experienceYears: { type: 'number' },
                  consultationFee: { type: 'number' },
                  isEmergencyAvailable: { type: 'boolean' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Doctor added successfully' },
        },
      },
    },
    '/api/v1/doctors/{id}': {
      get: {
        tags: ['Doctors Directory'],
        summary: 'Get Doctor Profile by ID',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Doctor details' },
          404: { description: 'Doctor not found' },
        },
      },
      put: {
        tags: ['Doctors Directory'],
        summary: 'Update Doctor (Admin / Hospital Admin)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Doctor updated' },
        },
      },
      delete: {
        tags: ['Doctors Directory'],
        summary: 'Remove Doctor (Admin / Hospital Admin)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Doctor deleted' },
        },
      },
    },
    '/api/v1/admin/dashboard-stats': {
      get: {
        tags: ['Admin Management'],
        summary: 'System Dashboard Aggregate Metrics (Super Admin)',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Healthcare system metrics (hospitals, beds, ICU, oxygen, ambulances, doctors)' },
        },
      },
    },
    '/api/v1/admin/users': {
      get: {
        tags: ['Admin Management'],
        summary: 'List Registered Users with Search & Pagination (Super Admin)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'role', in: 'query', schema: { type: 'string' } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
        ],
        responses: {
          200: { description: 'Paginated user list' },
        },
      },
    },
    '/api/v1/admin/users/{id}/role': {
      patch: {
        tags: ['Admin Management'],
        summary: 'Update User Role & Assigned Hospital (Super Admin)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['role'],
                properties: {
                  role: { type: 'string', enum: ['user', 'hospital_admin', 'super_admin'] },
                  hospitalAssigned: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'User role updated' },
        },
      },
    },
    '/api/v1/admin/users/{id}/status': {
      patch: {
        tags: ['Admin Management'],
        summary: 'Activate or Deactivate User Account (Super Admin)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['isActive'],
                properties: {
                  isActive: { type: 'boolean' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'User active status updated' },
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
