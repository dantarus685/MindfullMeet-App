// server.js - Complete implementation
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
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"]
  },
  allowEIO3: true, // Allow Engine.IO v3 clients
  transports: ['websocket', 'polling']
});

// Store active connections
const activeConnections = new Map();
const roomMembers = new Map(); // Track who's in each room

// Helper function to log with timestamp
const log = (message, data = '') => {
  console.log(`[${new Date().toISOString()}] ${message}`, data);
};

// Socket authentication middleware
const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || 
                 socket.handshake.headers.authorization?.replace('Bearer ', '') ||
                 socket.request.headers.authorization?.replace('Bearer ', '');
    
    log(`🔐 Socket authentication attempt for token: ${token ? 'Present' : 'Missing'}`);
    
    if (!token) {
      log('❌ No token provided for socket authentication');
      return next(new Error('No token provided'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id, {
      attributes: ['id', 'name', 'email', 'profileImage', 'role', 'active']
    });
    
    if (!user || !user.active) {
      log('❌ User not found or inactive:', decoded.id);
      return next(new Error('User not found or inactive'));
    }

    socket.userId = user.id;
    socket.user = user;
    log(`✅ Socket authenticated for user: ${user.name} (${user.id})`);
    next();
  } catch (error) {
    log('❌ Socket authentication error:', error.message);
    next(new Error('Authentication failed'));
  }
};

// Apply authentication middleware
io.use(authenticateSocket);

// Socket.io connection for real-time chat
io.on('connection', (socket) => {
  log(`🔌 User ${socket.user.name} (${socket.userId}) connected`, `Socket ID: ${socket.id}`);
  
  // Store connection
  activeConnections.set(socket.userId, {
    socketId: socket.id,
    socket: socket,
    user: socket.user,
    rooms: new Set(),
    lastActivity: new Date()
  });

  // Send connection confirmation
  socket.emit('connected', {
    userId: socket.userId,
    user: socket.user,
    timestamp: new Date().toISOString()
  });

  // Join a support room
  socket.on('joinRoom', async (data) => {
    try {
      const { roomId } = data;
      log(`🚪 User ${socket.user.name} attempting to join room:`, roomId);
      
      if (!roomId) {
        socket.emit('error', { message: 'Room ID is required' });
        return;
      }

      // Verify user is participant in this room
      const room = await SupportRoom.findByPk(roomId, {
        include: [{
          model: User,
          as: 'participants',
          where: { id: socket.userId },
          attributes: ['id', 'name', 'profileImage', 'role'],
          through: { attributes: [] }
        }]
      });

      if (!room) {
        log(`❌ Room ${roomId} not found or access denied for user ${socket.userId}`);
        socket.emit('error', { message: 'Room not found or access denied' });
        return;
      }

      // Join the socket room
      await socket.join(`room_${roomId}`);
      
      // Track room membership
      const userConnection = activeConnections.get(socket.userId);
      if (userConnection) {
        userConnection.rooms.add(roomId);
        userConnection.lastActivity = new Date();
      }

      // Track room members
      if (!roomMembers.has(roomId)) {
        roomMembers.set(roomId, new Set());
      }
      roomMembers.get(roomId).add(socket.userId);

      log(`✅ User ${socket.user.name} successfully joined room ${roomId}`);
      
      // Notify other room members
      socket.to(`room_${roomId}`).emit('userJoinedRoom', {
        roomId,
        user: {
          id: socket.user.id,
          name: socket.user.name,
          profileImage: socket.user.profileImage,
          role: socket.user.role
        },
        timestamp: new Date().toISOString()
      });

      // Send confirmation to the user who joined
      socket.emit('roomJoined', { 
        roomId,
        room: {
          id: room.id,
          name: room.name,
          type: room.type
        },
        participants: room.participants,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      log('❌ Error joining room:', error.message);
      socket.emit('error', { message: 'Failed to join room', error: error.message });
    }
  });

  // Leave a room
  socket.on('leaveRoom', async (data) => {
    try {
      const { roomId } = data;
      log(`🚪 User ${socket.user.name} leaving room:`, roomId);

      if (!roomId) {
        socket.emit('error', { message: 'Room ID is required' });
        return;
      }

      // Leave the socket room
      await socket.leave(`room_${roomId}`);
      
      // Update tracking
      const userConnection = activeConnections.get(socket.userId);
      if (userConnection) {
        userConnection.rooms.delete(roomId);
      }

      // Remove from room members
      if (roomMembers.has(roomId)) {
        roomMembers.get(roomId).delete(socket.userId);
        if (roomMembers.get(roomId).size === 0) {
          roomMembers.delete(roomId);
        }
      }

      // Notify other room members
      socket.to(`room_${roomId}`).emit('userLeftRoom', {
        roomId,
        userId: socket.userId,
        userName: socket.user.name,
        timestamp: new Date().toISOString()
      });

      socket.emit('roomLeft', { roomId, timestamp: new Date().toISOString() });
      log(`✅ User ${socket.user.name} left room ${roomId}`);

    } catch (error) {
      log('❌ Error leaving room:', error.message);
      socket.emit('error', { message: 'Failed to leave room', error: error.message });
    }
  });

  // Handle support messages
  socket.on('sendMessage', async (data) => {
    try {
      const { roomId, content } = data;
      log(`📤 User ${socket.user.name} sending message to room ${roomId}:`, content?.substring(0, 50));

      if (!roomId || !content || content.trim().length === 0) {
        socket.emit('error', { message: 'Room ID and message content are required' });
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
        log(`❌ Room ${roomId} not found or access denied for user ${socket.userId}`);
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

      // Format message for frontend compatibility
      const formattedMessage = {
        id: completeMessage.id,
        content: completeMessage.content,
        senderId: completeMessage.senderId,
        roomId: completeMessage.roomId,
        isRead: completeMessage.isRead,
        createdAt: completeMessage.createdAt,
        updatedAt: completeMessage.updatedAt,
        sender: completeMessage.sender
      };

      // Emit to all room members
      io.to(`room_${roomId}`).emit('newMessage', {
        message: formattedMessage,
        roomId
      });

      // Send confirmation to sender
      socket.emit('messageSent', {
        messageId: completeMessage.id,
        roomId,
        timestamp: completeMessage.createdAt
      });

      log(`✅ Message sent in room ${roomId} by ${socket.user.name}`);

    } catch (error) {
      log('❌ Error sending message:', error.message);
      socket.emit('error', { message: 'Failed to send message', error: error.message });
    }
  });

  // Handle typing indicators
  socket.on('typing', (data) => {
    try {
      const { roomId, isTyping } = data;
      
      if (!roomId) {
        return; // Silently ignore invalid typing events
      }

      // Only emit if user is actually in the room
      const userConnection = activeConnections.get(socket.userId);
      if (userConnection && userConnection.rooms.has(roomId)) {
        socket.to(`room_${roomId}`).emit('userTyping', {
          roomId,
          userId: socket.userId,
          userName: socket.user.name,
          isTyping,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      log('❌ Error handling typing indicator:', error.message);
    }
  });

  // Handle message read status
  socket.on('markMessagesRead', async (data) => {
    try {
      const { roomId } = data;
      log(`👁️ User ${socket.user.name} marking messages as read in room:`, roomId);
      
      if (!roomId) {
        socket.emit('error', { message: 'Room ID is required' });
        return;
      }

      // Update messages to read status
      const [updatedCount] = await SupportMessage.update(
        { isRead: true },
        {
          where: {
            roomId,
            senderId: { [Op.ne]: socket.userId },
            isRead: false
          }
        }
      );

      log(`✅ Marked ${updatedCount} messages as read in room ${roomId}`);

      // Notify other room members
      socket.to(`room_${roomId}`).emit('messagesRead', {
        roomId,
        userId: socket.userId,
        userName: socket.user.name,
        timestamp: new Date().toISOString()
      });

      // Confirm to sender
      socket.emit('messagesMarkedRead', {
        roomId,
        count: updatedCount,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      log('❌ Error marking messages as read:', error.message);
      socket.emit('error', { message: 'Failed to mark messages as read', error: error.message });
    }
  });

  // Handle ping for connection testing
  socket.on('ping', (data) => {
    socket.emit('pong', {
      ...data,
      serverTime: new Date().toISOString(),
      userId: socket.userId
    });
  });

  // Handle user status updates
  socket.on('updateStatus', (data) => {
    const { status = 'online' } = data;
    
    // Update user connection info
    const userConnection = activeConnections.get(socket.userId);
    if (userConnection) {
      userConnection.lastActivity = new Date();
      userConnection.status = status;
      
      // Notify all rooms this user is in
      userConnection.rooms.forEach(roomId => {
        socket.to(`room_${roomId}`).emit('userStatusChange', {
          roomId,
          userId: socket.userId,
          userName: socket.user.name,
          status,
          timestamp: new Date().toISOString()
        });
      });
    }
  });
  
  // Handle disconnection
  socket.on('disconnect', (reason) => {
    log(`❌ User ${socket.user.name} (${socket.userId}) disconnected:`, reason);
    
    const userConnection = activeConnections.get(socket.userId);
    if (userConnection) {
      // Notify all rooms this user was in
      userConnection.rooms.forEach(roomId => {
        socket.to(`room_${roomId}`).emit('userLeftRoom', {
          roomId,
          userId: socket.userId,
          userName: socket.user.name,
          reason: 'disconnected',
          timestamp: new Date().toISOString()
        });
        
        // Remove from room members tracking
        if (roomMembers.has(roomId)) {
          roomMembers.get(roomId).delete(socket.userId);
          if (roomMembers.get(roomId).size === 0) {
            roomMembers.delete(roomId);
          }
        }
      });
    }
    
    activeConnections.delete(socket.userId);
  });

  // Handle errors
  socket.on('error', (error) => {
    log('❌ Socket error:', error);
  });
});

// Periodic cleanup of inactive connections
setInterval(() => {
  const now = new Date();
  const inactiveThreshold = 5 * 60 * 1000; // 5 minutes
  
  for (const [userId, connection] of activeConnections.entries()) {
    if (now - connection.lastActivity > inactiveThreshold) {
      log(`🧹 Cleaning up inactive connection for user:`, userId);
      connection.socket.disconnect();
      activeConnections.delete(userId);
    }
  }
}, 60000); // Run every minute

// Start server
const PORT = process.env.PORT || 5000;

// Add better error handling for database connection
const startServer = async () => {
  try {
    log('🔗 Connecting to database...');
    
    // Test the connection first
    await db.sequelize.authenticate();
    log('✅ Database connection established successfully');
    
    // Then sync all models
    log('📊 Creating/updating database tables...');
    await db.sequelize.sync(); // no force = just create if not exists
    log('✅ All models synchronized successfully');
    
    server.listen(PORT, () => {
      log(`🚀 Server running on port ${PORT}`);
      log('📡 Socket.io ready for real-time chat');
      log(`🌐 CORS origins configured for development and production`);
    });
  } catch (err) {
    log('❌ Database connection/sync error:', err.message);
    log('🔄 Retrying in 5 seconds...');
    setTimeout(startServer, 5000);
  }
};

startServer();

// Graceful shutdown
const gracefulShutdown = () => {
  log('📡 Shutting down server gracefully...');
  
  // Close all socket connections
  io.close(() => {
    log('✅ All socket connections closed');
  });
  
  // Close HTTP server
  server.close(() => {
    log('✅ HTTP server closed');
    process.exit(0);
  });
  
  // Force close after 10 seconds
  setTimeout(() => {
    log('⚠️ Forcing server shutdown');
    process.exit(1);
  }, 10000);
};

// Handle shutdown signals
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  log('❌ UNHANDLED REJECTION:', err.message);
  console.error(err);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  log('❌ UNCAUGHT EXCEPTION:', err.message);
  console.error(err);
  gracefulShutdown();
});

// Export for testing
module.exports = { server, io, activeConnections, roomMembers };