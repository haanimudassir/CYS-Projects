const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

require('dotenv').config({ quiet: true });

const { testConnection } = require('./config/db');


// Import routes
const authRoutes = require('./routes/auth');
const incidentRoutes = require('./routes/incidents');
const assetRoutes = require('./routes/assets');
const userRoutes = require('./routes/users');
const dashboardRoutes = require('./routes/dashboard');
const reportRoutes = require('./routes/reports');
const actionRoutes = require('./routes/actions');
const metaRoutes = require('./routes/meta');


const app = express();

const PORT = process.env.PORT || 5000;

// ============================================================
// MIDDLEWARE
// ============================================================


// Security headers
app.use(helmet());


// CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));


// Logging
app.use(morgan('dev'));


// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));


// Rate limiting
const limiter = rateLimit({

  windowMs:
    parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,

  max:
    parseInt(process.env.RATE_LIMIT_MAX) || 100,

  message: {
    success: false,
    message: 'Too many requests, please try again later.'
  }

});


app.use('/api/', limiter);



// Uploaded files
app.use(
  '/uploads',
  express.static(path.join(__dirname, 'uploads'))
);


// ============================================================
// ROUTES
// ============================================================


// Health check
app.get('/api/health', (req, res) => {

  res.json({

    success: true,

    message: 'IRLMS API is running',

    timestamp: new Date().toISOString(),

    version: '1.0.0'

  });

});



// API routes

app.use('/api/auth', authRoutes);

app.use('/api/incidents', incidentRoutes);

app.use('/api/assets', assetRoutes);

app.use('/api/users', userRoutes);

app.use('/api/dashboard', dashboardRoutes);

app.use('/api/reports', reportRoutes);

app.use('/api/actions', actionRoutes);
app.use('/api/meta', metaRoutes);


// ============================================================
// ERROR HANDLING
// ============================================================


// 404
app.use((req, res) => {

  res.status(404).json({

    success: false,

    message: `Route ${req.originalUrl} not found`

  });

});



// Global error handler
app.use((err, req, res, next) => {

  console.error('Unhandled error:', err);


  res.status(500).json({

    success: false,

    message:
      process.env.NODE_ENV === 'development'
        ? err.message
        : 'Internal server error'

  });

});


// ============================================================
// START SERVER
// ============================================================


const startServer = async () => {


  const dbConnected = await testConnection();



  if (!dbConnected) {

    console.error(
      '❌ Cannot start server without database connection'
    );

    console.error(
      'Please check your database configuration in .env'
    );

    process.exit(1);

  }



  app.listen(PORT, () => {


    console.log('\n========================================');

    console.log('  IRLMS API Server');

    console.log('========================================');

    console.log(
      `  Environment: ${process.env.NODE_ENV || 'development'}`
    );

    console.log(
      `  Port:        ${PORT}`
    );

    console.log(
      `  API Base:    http://localhost:${PORT}/api`
    );

    console.log(
      `  Health:      http://localhost:${PORT}/api/health`
    );

    console.log('========================================\n');


  });


};


if (require.main === module) {
  startServer();
}

module.exports = app;