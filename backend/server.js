// server.js
require('dotenv').config();
const http = require('http');
const socketIo = require('socket.io');
const app = require('./app');
const db = require('./models');
const jwt = require('jsonwebtoken');
const { SupportRoom, SupportMessage, User } = require('./models');
const { Op } = require('sequelize');

const server = http.createServer(app);

// Set up Socket.io with CORS
const io = socketIo(server, {
  cors: {
    origin: [
      'http://localhost:8081',
      'http://localhost:19006', // Expo web
      /^exp:\/\/.*/,            // Expo Go app
      /^http:\/\/192\.168\.\d+\.\d+:\d+$/, // Local network IP for Expo
      'http://localhost:8080',  // Common webpack port
      'exp://localhost:8081',   // Another common Expo format
      'exp://127.0.0.1:8081',   // Another Expo format
      process.env.FRONTEND_URL || "*"
    ],
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Store active connections
const activeConnections = new Map();

// Socket authentication middleware
const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return next(new Error('No token provided'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id);
    
    if (!user || !user.active) {
      return next(new Error('User not found or inactive'));
    }

    socket.userId = user.id;
    socket.user = user;
    next();
  } catch (error) {
    console.error('Socket authentication error:', error);
    next(new Error('Authentication failed'));
  }
};

// Apply authentication middleware
io.use(authenticateSocket);

// Socket.io connection for real-time chat
io.on('connection', (socket) => {
  console.log(`User ${socket.user.name} (${socket.userId}) connected to support chat`);
  
  // Store connection
  activeConnections.set(socket.userId, {
    socketId: socket.id,
    user: socket.user,
    rooms: new Set()
  });

  // Join a support room
  socket.on('joinRoom', async (data) => {
    try {
      const { roomId } = data;
      
      // Verify user is participant in this room
      const room = await SupportRoom.findByPk(roomId, {
        include: [{
          model: User,
          as: 'participants',
          where: { id: socket.userId },
          attributes: ['id'],
          through: { attributes: [] }
        }]
      });

      if (!room) {
        socket.emit('error', { message: 'Room not found or access denied' });
        return;
      }

      socket.join(`room_${roomId}`);
      
      // Track room membership
      const userConnection = activeConnections.get(socket.userId);
      if (userConnection) {
        userConnection.rooms.add(roomId);
      }

      console.log(`User ${socket.user.name} joined room ${roomId}`);
      
      // Notify other room members
      socket.to(`room_${roomId}`).emit('userJoinedRoom', {
        roomId,
        user: {
          id: socket.user.id,
          name: socket.user.name,
          profileImage: socket.user.profileImage
        }
      });

      socket.emit('roomJoined', { roomId });
    } catch (error) {
      console.error('Error joining room:', error);
      socket.emit('error', { message: 'Failed to join room' });
    }
  });

  // Handle support messages
  socket.on('sendMessage', async (data) => {
    try {
      const { roomId, content } = data;

      if (!content || content.trim().length === 0) {
        socket.emit('error', { message: 'Message content is required' });
        return;
      }

      // Verify user is participant
      const room = await SupportRoom.findByPk(roomId, {
        include: [{
          model: User,
          as: 'participants',
          where: { id: socket.userId },
          attributes: ['id'],
          through: { attributes: [] }
        }]
      });

      if (!room) {
        socket.emit('error', { message: 'Room not found or access denied' });
        return;
      }

      // Create message in database
      const message = await SupportMessage.create({
        content: content.trim(),
        roomId,
        senderId: socket.userId,
        isRead: false
      });

      // Fetch complete message with sender info
      const completeMessage = await SupportMessage.findByPk(message.id, {
        include: [{
          model: User,
          as: 'sender',
          attributes: ['id', 'name', 'profileImage', 'role']
        }]
      });

      // Update room timestamp
      await room.update({ updatedAt: new Date() });

      // Emit to all room members
      io.to(`room_${roomId}`).emit('newMessage', {
        message: completeMessage,
        roomId
      });

      console.log(`Message sent in room ${roomId} by ${socket.user.name}`);
    } catch (error) {
      console.error('Error sending message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  // Handle typing indicators
  socket.on('typing', (data) => {
    const { roomId, isTyping } = data;
    socket.to(`room_${roomId}`).emit('userTyping', {
      roomId,
      userId: socket.userId,
      userName: socket.user.name,
      isTyping
    });
  });

  // Handle message read status
  socket.on('markMessagesRead', async (data) => {
    try {
      const { roomId } = data;
      
      await SupportMessage.update(
        { isRead: true },
        {
          where: {
            roomId,
            senderId: { [Op.ne]: socket.userId },
            isRead: false
          }
        }
      );

      socket.to(`room_${roomId}`).emit('messagesRead', {
        roomId,
        userId: socket.userId
      });
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`User ${socket.user.name} (${socket.userId}) disconnected from support chat`);
    activeConnections.delete(socket.userId);
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
      console.log(`🚀 Server running on port ${PORT}`);
      console.log('📡 Socket.io ready for real-time chat');
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
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! Details:', err);
});