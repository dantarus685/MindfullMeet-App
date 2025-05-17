// server.js
require('dotenv').config();
const http = require('http');
const socketIo = require('socket.io');
const app = require('./app');
const db = require('./models');

const server = http.createServer(app);

// Set up Socket.io with CORS
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "*",
    methods: ["GET", "POST"]
  }
});

// Socket.io connection for real-time chat
io.on('connection', (socket) => {
  console.log('User connected to support chat');
  
  // Join a support room
  socket.on('joinRoom', (roomId) => {
    socket.join(roomId);
    console.log(`User joined room: ${roomId}`);
  });
  
  // Handle support messages
  socket.on('supportMessage', (data) => {
    io.to(data.roomId).emit('message', data);
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected from support chat');
  });
});

// Start server
const PORT = process.env.PORT || 5000;

// Add better error handling for database connection
const startServer = async () => {
  try {
    console.log('Connecting to database...');
    
    // Test the connection first
    await db.sequelize.authenticate();
    console.log('Connection has been established successfully.');
    
    // Then sync all models
    console.log('Creating tables...');
    await db.sequelize.sync(); // no force = just create if not exists
    console.log('All models were synchronized successfully.');
    
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Unable to connect to the database or sync models:', err);
    console.log('Retrying in 5 seconds...');
    setTimeout(startServer, 5000);
  }
};

startServer();

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION! Details:', err);
  // Don't exit the process, just log the error
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! Details:', err);
  // Don't exit the process, just log the error
});