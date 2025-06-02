// app.js - Fixed Express app with Socket.IO setup (REMOVE DUPLICATE HANDLERS)
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

// Import route modules
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const eventRoutes = require('./routes/eventRoutes');
const trackingRoutes = require('./routes/trackingRoutes');
const supportRoutes = require('./routes/supportRoutes');

// Import Socket.IO handlers
const { setupChatHandlers } = require('./socketHandlers/chatHandler');

const app = express();
const server = http.createServer(app);

// Simplified CORS origins
const allowedOrigins = [
  'http://localhost:8081',
  'http://localhost:19006',
  'http://localhost:8080',
  'http://127.0.0.1:8081',
  'http://127.0.0.1:19006',
  'http://127.0.0.1:8080',
  'http://192.168.56.1:8081',
  'http://192.168.56.146:8081',
  'http://192.168.56.146:19006', 
  'http://192.168.56.146:8080',
  process.env.FRONTEND_URL
].filter(Boolean);

// Enhanced CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check if origin is in allowed list or matches Expo pattern
    if (allowedOrigins.includes(origin) || 
        /^exp:\/\/.*/.test(origin) || 
        /^http:\/\/192\.168\.\d+\.\d+:\d+$/.test(origin)) {
      return callback(null, true);
    }
    
    console.log('❌ CORS blocked origin:', origin);
    callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With',
    'Accept',
    'Origin'
  ],
  credentials: true,
  optionsSuccessStatus: 200
};

// Socket.IO configuration - Simplified
const io = socketIo(server, {
  cors: corsOptions,
  allowEIO3: true,
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
  upgradeTimeout: 30000,
  maxHttpBufferSize: 1e6,
  cookie: false,
  serveClient: false
});

// Middleware setup - Order is important!
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false
}));

// Apply CORS before other middleware
app.use(cors(corsOptions));

// Logging middleware
app.use(morgan('combined'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static file serving
const uploadsPath = path.join(__dirname, 'uploads');
app.use('/uploads', express.static(uploadsPath));
console.log('📂 Static file serving enabled for /uploads');

// Health check endpoint - Place this BEFORE other routes to avoid conflicts
app.get('/health', (req, res) => {
  const uptime = process.uptime();
  const memoryUsage = process.memoryUsage();
  
  res.json({
    status: 'healthy',
    uptime: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`,
    memory: {
      used: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
      total: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`
    },
    connections: {
      active: io.engine.clientsCount
    },
    database: 'connected',
    cors: 'enabled',
    timestamp: new Date().toISOString(),
    network: {
      listening: '0.0.0.0',
      port: process.env.PORT || 5000
    }
  });
});

// Basic route for testing
app.get('/', (req, res) => {
  res.json({
    message: 'MindfullMeet API Server',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      events: '/api/events',
      tracking: '/api/tracking',
      support: '/api/support',
      health: '/health'
    }
  });
});

// API Routes
console.log('🔗 Registering routes...');

app.use('/api/auth', authRoutes);
console.log('✅ /api/auth routes registered');

app.use('/api/users', userRoutes);
console.log('✅ /api/users routes registered');

app.use('/api/events', eventRoutes);
console.log('✅ /api/events routes registered');
app.use('/api/chat', supportRoutes); // For compatibility with frontend expecting /api/chat

app.use('/api/tracking', trackingRoutes);
console.log('✅ /api/tracking routes registered');

app.use('/api/support', supportRoutes);
console.log('✅ /api/support routes registered');

// Setup Socket.IO chat handlers - THIS IS THE ONLY PLACE WHERE SOCKET HANDLERS SHOULD BE SET UP
console.log('📡 Setting up Socket.IO chat handlers...');
setupChatHandlers(io);
console.log('✅ Socket.IO chat handlers configured');

// **REMOVED DUPLICATE CONNECTION HANDLER** - All socket logic is now in chatHandler.js

// Handle 404 errors for API routes only
app.use('/api/*', (req, res) => {
  res.status(404).json({
    error: 'API Route not found',
    message: `Cannot ${req.method} ${req.originalUrl}`,
    availableRoutes: [
      '/api/auth',
      '/api/users', 
      '/api/events',
      '/api/tracking',
      '/api/support'
    ]
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Global error handler:', err.message);
  
  // Handle CORS errors specifically
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      error: 'CORS error',
      message: 'Origin not allowed',
      timestamp: new Date().toISOString()
    });
  }
  
  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }
  
  res.status(err.status || 500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong!',
    timestamp: new Date().toISOString()
  });
});

// Export both app and server
module.exports = { app, server, io };