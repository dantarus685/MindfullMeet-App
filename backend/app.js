require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors'); // Add this import

app.use(express.json());
// Custom request logger middleware

// Configure CORS - add this before other middleware
app.use(cors({
  origin: [
    'http://localhost:8081',
    'http://localhost:19006', // Expo web
    /^exp:\/\/.*/,            // Expo Go app
    /^http:\/\/192\.168\.\d+\.\d+:\d+$/, // Local network IP for Expo
    'http://localhost:8080',  // Common webpack port
    'exp://localhost:8081',   // Another common Expo format
    'exp://127.0.0.1:8081'    // Another Expo format
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));
app.use((req, res, next) => {
  const start = Date.now();
  const timestamp = new Date().toISOString();
  
  console.log(`\x1b[36m→\x1b[0m [\x1b[34m${timestamp}\x1b[0m] \x1b[35m${req.method}\x1b[0m ${req.originalUrl}`);
  
  // Log query parameters if they exist
  if (Object.keys(req.query).length > 0) {
    console.log(`  Query Params: ${JSON.stringify(req.query)}`);
  }
  
  // Log request body for POST/PUT/PATCH methods (if not multipart/form-data)
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && 
      req.headers['content-type']?.includes('application/json') && 
      Object.keys(req.body).length > 0) {
    // Sanitize password fields for security
    const sanitizedBody = { ...req.body };
    if (sanitizedBody.password) sanitizedBody.password = '********';
    if (sanitizedBody.passwordConfirm) sanitizedBody.passwordConfirm = '********';
    console.log(`  Request Body: ${JSON.stringify(sanitizedBody)}`);
  }
  
  // Capture the original end function
  const originalEnd = res.end;
  
  // Override the end function to log response info
  res.end = function(chunk, encoding) {
    const duration = Date.now() - start;
    const statusColor = res.statusCode >= 500 ? 31 // red
      : res.statusCode >= 400 ? 33 // yellow
      : res.statusCode >= 300 ? 36 // cyan
      : res.statusCode >= 200 ? 32 // green
      : 0; // no color
    
    console.log(`\x1b[36m←\x1b[0m [\x1b[34m${timestamp}\x1b[0m] \x1b[35m${req.method}\x1b[0m ${req.originalUrl} \x1b[${statusColor}m${res.statusCode}\x1b[0m \x1b[33m${duration}ms\x1b[0m`);
    
    // Call the original end function
    return originalEnd.call(this, chunk, encoding);
  };
  
  next();
});
// Just a simple home route
app.get('/', (req, res) => {
  res.json({ message: 'API is running' });
});

// Import routes one by one
const authRoutes = require('./routes/authRoutes');
const eventRoutes = require('./routes/eventRoutes');
const userRoutes = require('./routes/userRoutes');
const trackingRoutes = require('./routes/trackingRoutes');
const supportRoutes = require('./routes/supportRoutes');

// Register routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tracking', trackingRoutes);
app.use('/api/support', supportRoutes);

// Very simple error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message });
});

module.exports = app;