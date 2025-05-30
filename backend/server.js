// server.js - Enhanced version with proper CORS for your IP
require('dotenv').config();
const http = require('http');
const socketIo = require('socket.io');
const app = require('./app');
const db = require('./models');
const jwt = require('jsonwebtoken');
const { SupportRoom, SupportMessage, User } = require('./models');
const { Op } = require('sequelize');

const server = http.createServer(app);

// Enhanced Socket.io configuration with your specific IP
const io = socketIo(server, {
  cors: {
    origin: [
      'http://localhost:8081',
      'http://localhost:19006', // Expo web
      'http://localhost:8080',  // Common webpack port
      'http://192.168.1.146:8081', // 👈 YOUR IP + EXPO PORT
      'http://192.168.1.146:19006', // 👈 YOUR IP + EXPO WEB PORT
      'http://192.168.1.146:8080', // 👈 YOUR IP + WEBPACK PORT
      /^exp:\/\/.*/,            // Expo Go app
      /^http:\/\/192\.168\.\d+\.\d+:\d+$/, // Local network IP for Expo (regex)
      'exp://localhost:8081',   // Expo format
      'exp://127.0.0.1:8081',   // Expo format
      'exp://192.168.1.146:8081', // 👈 YOUR IP + EXPO FORMAT
      process.env.FRONTEND_URL || "*"
    ],
    methods: ["GET", "POST"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"]
  },
  allowEIO3: true, // Allow Engine.IO v3 clients
  transports: ['websocket', 'polling'],
  // Enhanced configuration for React Native
  pingTimeout: 60000,
  pingInterval: 25000,
  upgradeTimeout: 30000,
  maxHttpBufferSize: 1e6, // 1MB max message size
  // Additional React Native specific settings
  cookie: false,
  serveClient: false
});

// Enhanced connection tracking
const activeConnections = new Map();
const roomMembers = new Map();
const userRooms = new Map();
const typingTimeouts = new Map();

// Enhanced helper function to log with timestamp
const log = (message, data = '') => {
  console.log(`[${new Date().toISOString()}] ${message}`, data);
};

// Helper functions
const getUserRooms = async (userId) => {
  try {
    const rooms = await SupportRoom.findAll({
      include: [{
        model: User,
        as: 'participants',
        where: { id: userId },
        attributes: [],
        through: { attributes: [] }
      }],
      attributes: ['id']
    });
    return rooms.map(room => room.id);
  } catch (error) {
    log('❌ Error fetching user rooms:', error.message);
    return [];
  }
};

const cleanupTypingIndicator = (roomId, userId) => {
  const key = `${roomId}-${userId}`;
  const timeout = typingTimeouts.get(key);
  if (timeout) {
    clearTimeout(timeout);
    typingTimeouts.delete(key);
  }
};

const setTypingTimeout = (roomId, userId, socket) => {
  const key = `${roomId}-${userId}`;
  cleanupTypingIndicator(roomId, userId);
  
  const timeout = setTimeout(() => {
    socket.to(`room_${roomId}`).emit('userTyping', {
      roomId,
      userId,
      userName: socket.user.name,
      isTyping: false,
      timestamp: new Date().toISOString()
    });
    typingTimeouts.delete(key);
  }, 3000);
  
  typingTimeouts.set(key, timeout);
};

// Enhanced socket authentication middleware
const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || 
                 socket.handshake.headers.authorization?.replace('Bearer ', '') ||
                 socket.request.headers.authorization?.replace('Bearer ', '');
    
    log(`🔐 Socket authentication attempt for token: ${token ? 'Present' : 'Missing'}`);
    log(`🔍 Socket handshake details:`, {
      origin: socket.handshake.headers.origin,
      userAgent: socket.handshake.headers['user-agent'],
      referer: socket.handshake.headers.referer,
      remoteAddress: socket.request.connection.remoteAddress
    });
    
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
    socket.authenticated = true;
    socket.joinTime = new Date();
    
    log(`✅ Socket authenticated for user: ${user.name} (${user.id})`);
    next();
  } catch (error) {
    log('❌ Socket authentication error:', error.message);
    if (error.name === 'JsonWebTokenError') {
      next(new Error('Invalid token'));
    } else if (error.name === 'TokenExpiredError') {
      next(new Error('Token expired'));
    } else {
      next(new Error('Authentication failed'));
    }
  }
};

// Apply authentication middleware
io.use(authenticateSocket);

// Enhanced Socket.io connection handler
io.on('connection', (socket) => {
  log(`🔌 User ${socket.user.name} (${socket.userId}) connected`, `Socket ID: ${socket.id}`);
  
  // Enhanced connection storage
  activeConnections.set(socket.userId, {
    socketId: socket.id,
    socket: socket,
    user: socket.user,
    rooms: new Set(),
    lastActivity: new Date(),
    joinTime: socket.joinTime,
    messageCount: 0,
    status: 'online'
  });

  // Get user's rooms and store them
  getUserRooms(socket.userId).then(rooms => {
    userRooms.set(socket.userId, new Set(rooms));
    log(`📊 User ${socket.user.name} is in ${rooms.length} rooms`);
  });

  // Enhanced connection confirmation
  socket.emit('connected', {
    userId: socket.userId,
    user: socket.user,
    timestamp: new Date().toISOString(),
    serverInfo: {
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    }
  });

  // Enhanced join room handler
  socket.on('joinRoom', async (data) => {
    try {
      const { roomId } = data;
      log(`🚪 User ${socket.user.name} attempting to join room:`, roomId);
      
      if (!roomId) {
        socket.emit('error', { 
          message: 'Room ID is required',
          code: 'MISSING_ROOM_ID'
        });
        return;
      }

      // Room verification logic
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
        socket.emit('error', { 
          message: 'Room not found or access denied',
          code: 'ROOM_ACCESS_DENIED'
        });
        return;
      }

      // Join logic with enhancements
      await socket.join(`room_${roomId}`);
      
      // Enhanced tracking
      const userConnection = activeConnections.get(socket.userId);
      if (userConnection) {
        userConnection.rooms.add(parseInt(roomId));
        userConnection.lastActivity = new Date();
      }

      // Enhanced room member tracking
      if (!roomMembers.has(roomId)) {
        roomMembers.set(roomId, new Set());
      }
      roomMembers.get(roomId).add(socket.userId);

      // Add to user rooms
      if (!userRooms.has(socket.userId)) {
        userRooms.set(socket.userId, new Set());
      }
      userRooms.get(socket.userId).add(parseInt(roomId));

      log(`✅ User ${socket.user.name} successfully joined room ${roomId}`);
      
      // Enhanced notification to other room members
      socket.to(`room_${roomId}`).emit('userJoinedRoom', {
        roomId: parseInt(roomId),
        user: {
          id: socket.user.id,
          name: socket.user.name,
          profileImage: socket.user.profileImage,
          role: socket.user.role
        },
        timestamp: new Date().toISOString(),
        onlineCount: roomMembers.get(roomId)?.size || 1
      });

      // Enhanced confirmation to the user who joined
      socket.emit('roomJoined', { 
        roomId: parseInt(roomId),
        room: {
          id: room.id,
          name: room.name,
          type: room.type,
          participantCount: room.participants.length
        },
        participants: room.participants,
        onlineCount: roomMembers.get(roomId)?.size || 1,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      log('❌ Error joining room:', error.message);
      socket.emit('error', { 
        message: 'Failed to join room', 
        error: error.message,
        code: 'JOIN_ROOM_ERROR'
      });
    }
  });

  // Enhanced leave room handler
  socket.on('leaveRoom', async (data) => {
    try {
      const { roomId } = data;
      log(`🚪 User ${socket.user.name} leaving room:`, roomId);

      if (!roomId) {
        socket.emit('error', { 
          message: 'Room ID is required',
          code: 'MISSING_ROOM_ID'
        });
        return;
      }

      // Leave logic
      await socket.leave(`room_${roomId}`);
      
      // Enhanced tracking updates
      const userConnection = activeConnections.get(socket.userId);
      if (userConnection) {
        userConnection.rooms.delete(parseInt(roomId));
      }

      // Enhanced room member cleanup
      if (roomMembers.has(roomId)) {
        roomMembers.get(roomId).delete(socket.userId);
        if (roomMembers.get(roomId).size === 0) {
          roomMembers.delete(roomId);
        }
      }

      // Remove from user rooms
      if (userRooms.has(socket.userId)) {
        userRooms.get(socket.userId).delete(parseInt(roomId));
      }

      // Clean up typing indicators
      cleanupTypingIndicator(roomId, socket.userId);

      // Enhanced notification to other room members
      socket.to(`room_${roomId}`).emit('userLeftRoom', {
        roomId: parseInt(roomId),
        userId: socket.userId,
        userName: socket.user.name,
        timestamp: new Date().toISOString(),
        onlineCount: roomMembers.get(roomId)?.size || 0
      });

      socket.emit('roomLeft', { 
        roomId: parseInt(roomId), 
        timestamp: new Date().toISOString() 
      });
      
      log(`✅ User ${socket.user.name} left room ${roomId}`);

    } catch (error) {
      log('❌ Error leaving room:', error.message);
      socket.emit('error', { 
        message: 'Failed to leave room', 
        error: error.message,
        code: 'LEAVE_ROOM_ERROR'
      });
    }
  });

  // Enhanced message sending handler
  socket.on('sendMessage', async (data) => {
    try {
      const { roomId, content } = data;
      log(`📤 User ${socket.user.name} sending message to room ${roomId}:`, content?.substring(0, 50));

      if (!roomId || !content || content.trim().length === 0) {
        socket.emit('error', { 
          message: 'Room ID and message content are required',
          code: 'INVALID_MESSAGE_DATA'
        });
        return;
      }

      // Add message length validation
      if (content.trim().length > 1000) {
        socket.emit('error', { 
          message: 'Message too long (max 1000 characters)',
          code: 'MESSAGE_TOO_LONG'
        });
        return;
      }

      // Room verification
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
        socket.emit('error', { 
          message: 'Room not found or access denied',
          code: 'ROOM_ACCESS_DENIED'
        });
        return;
      }

      // Message creation logic
      const message = await SupportMessage.create({
        content: content.trim(),
        roomId: parseInt(roomId),
        senderId: socket.userId,
        isRead: false
      });

      // Fetch complete message
      const completeMessage = await SupportMessage.findByPk(message.id, {
        include: [{
          model: User,
          as: 'sender',
          attributes: ['id', 'name', 'profileImage', 'role']
        }]
      });

      // Update room
      await room.update({ updatedAt: new Date() });

      // Format message
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

      // Emit message
      io.to(`room_${roomId}`).emit('newMessage', {
        message: formattedMessage,
        roomId: parseInt(roomId),
        timestamp: new Date().toISOString()
      });

      // Send confirmation
      socket.emit('messageSent', {
        messageId: completeMessage.id,
        roomId: parseInt(roomId),
        timestamp: completeMessage.createdAt
      });

      // Update user stats
      const userConnection = activeConnections.get(socket.userId);
      if (userConnection) {
        userConnection.messageCount += 1;
        userConnection.lastActivity = new Date();
      }

      log(`✅ Message sent in room ${roomId} by ${socket.user.name}`);

    } catch (error) {
      log('❌ Error sending message:', error.message);
      socket.emit('error', { 
        message: 'Failed to send message', 
        error: error.message,
        code: 'SEND_MESSAGE_ERROR'
      });
    }
  });

  // Enhanced typing indicators
  socket.on('typing', (data) => {
    try {
      const { roomId, isTyping } = data;
      
      if (!roomId) {
        return; // Silently ignore invalid typing events
      }

      // Room check logic
      const userConnection = activeConnections.get(socket.userId);
      if (userConnection && userConnection.rooms.has(parseInt(roomId))) {
        
        socket.to(`room_${roomId}`).emit('userTyping', {
          roomId: parseInt(roomId),
          userId: socket.userId,
          userName: socket.user.name,
          isTyping,
          timestamp: new Date().toISOString()
        });

        // Enhanced auto-clear timeout
        if (isTyping) {
          setTypingTimeout(roomId, socket.userId, socket);
        } else {
          cleanupTypingIndicator(roomId, socket.userId);
        }
      }
    } catch (error) {
      log('❌ Error handling typing indicator:', error.message);
    }
  });

  // Enhanced message read status
  socket.on('markMessagesRead', async (data) => {
    try {
      const { roomId } = data;
      log(`👁️ User ${socket.user.name} marking messages as read in room:`, roomId);
      
      if (!roomId) {
        socket.emit('error', { 
          message: 'Room ID is required',
          code: 'MISSING_ROOM_ID'
        });
        return;
      }

      // Update logic
      const [updatedCount] = await SupportMessage.update(
        { isRead: true },
        {
          where: {
            roomId: parseInt(roomId),
            senderId: { [Op.ne]: socket.userId },
            isRead: false
          }
        }
      );

      log(`✅ Marked ${updatedCount} messages as read in room ${roomId}`);

      // Notifications
      socket.to(`room_${roomId}`).emit('messagesRead', {
        roomId: parseInt(roomId),
        userId: socket.userId,
        userName: socket.user.name,
        timestamp: new Date().toISOString()
      });

      // Confirmation
      socket.emit('messagesMarkedRead', {
        roomId: parseInt(roomId),
        count: updatedCount,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      log('❌ Error marking messages as read:', error.message);
      socket.emit('error', { 
        message: 'Failed to mark messages as read', 
        error: error.message,
        code: 'MARK_READ_ERROR'
      });
    }
  });

  // Enhanced ping handling
  socket.on('ping', (data) => {
    const responseData = {
      ...data,
      serverTime: new Date().toISOString(),
      userId: socket.userId,
      socketId: socket.id,
      uptime: process.uptime()
    };
    
    socket.emit('pong', responseData);
    
    // Update last activity
    const userConnection = activeConnections.get(socket.userId);
    if (userConnection) {
      userConnection.lastActivity = new Date();
    }
  });

  // Enhanced user status updates
  socket.on('updateStatus', (data) => {
    const { status = 'online' } = data;
    
    // Update logic with enhancements
    const userConnection = activeConnections.get(socket.userId);
    if (userConnection) {
      userConnection.lastActivity = new Date();
      userConnection.status = status;
      
      // Room notifications
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
  
  // Enhanced disconnection handling
  socket.on('disconnect', (reason) => {
    log(`❌ User ${socket.user.name} (${socket.userId}) disconnected:`, reason);
    
    const userConnection = activeConnections.get(socket.userId);
    if (userConnection) {
      // Enhanced session stats
      const sessionDuration = new Date() - userConnection.joinTime;
      log(`📊 Session stats for ${socket.user.name}:`, {
        duration: `${Math.round(sessionDuration / 1000)}s`,
        messages: userConnection.messageCount,
        rooms: userConnection.rooms.size
      });

      // Room notification logic
      userConnection.rooms.forEach(roomId => {
        // Clean up typing indicators
        cleanupTypingIndicator(roomId, socket.userId);
        
        socket.to(`room_${roomId}`).emit('userLeftRoom', {
          roomId,
          userId: socket.userId,
          userName: socket.user.name,
          reason: 'disconnected',
          timestamp: new Date().toISOString()
        });
        
        // Room cleanup
        if (roomMembers.has(roomId.toString())) {
          roomMembers.get(roomId.toString()).delete(socket.userId);
          if (roomMembers.get(roomId.toString()).size === 0) {
            roomMembers.delete(roomId.toString());
          }
        }
      });
    }
    
    // Cleanup with enhancements
    activeConnections.delete(socket.userId);
    userRooms.delete(socket.userId);
    
    // Clean up typing timeouts for this user
    const userTypingKeys = Array.from(typingTimeouts.keys()).filter(key => 
      key.endsWith(`-${socket.userId}`)
    );
    userTypingKeys.forEach(key => {
      clearTimeout(typingTimeouts.get(key));
      typingTimeouts.delete(key);
    });
  });

  // Enhanced error handling
  socket.on('error', (error) => {
    log('❌ Socket error:', error);
    
    // Enhanced error response
    socket.emit('error', {
      message: 'Socket error occurred',
      code: 'SOCKET_ERROR',
      timestamp: new Date().toISOString(),
      userId: socket.userId
    });
  });
});

// Enhanced periodic cleanup
const cleanupInterval = setInterval(() => {
  const now = new Date();
  const inactiveThreshold = 5 * 60 * 1000; // 5 minutes
  
  for (const [userId, connection] of activeConnections.entries()) {
    const inactiveTime = now - connection.lastActivity;
    
    if (inactiveTime > inactiveThreshold) {
      log(`🧹 Cleaning up inactive connection for user:`, userId);
      
      // Enhanced cleanup
      if (connection.socket && connection.socket.connected) {
        connection.socket.emit('forceDisconnect', {
          reason: 'inactivity',
          message: 'Disconnected due to inactivity'
        });
        connection.socket.disconnect();
      }
      activeConnections.delete(userId);
      userRooms.delete(userId);
    }
  }

  // Clean up empty rooms
  for (const [roomId, members] of roomMembers.entries()) {
    if (members.size === 0) {
      roomMembers.delete(roomId);
    }
  }

  // Clean up old typing timeouts
  const oldTimeouts = [];
  for (const [key, timeout] of typingTimeouts.entries()) {
    if (timeout._idleStart && (Date.now() - timeout._idleStart > 5 * 60 * 1000)) {
      oldTimeouts.push(key);
    }
  }
  
  oldTimeouts.forEach(key => {
    clearTimeout(typingTimeouts.get(key));
    typingTimeouts.delete(key);
  });

  // Enhanced logging
  if (activeConnections.size > 0) {
    log(`📊 Active connections: ${activeConnections.size}, Active rooms: ${roomMembers.size}`);
  }
}, 60000); // Run every minute

// Enhanced health check endpoint
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
      active: activeConnections.size,
      rooms: roomMembers.size,
      typing: typingTimeouts.size
    },
    database: 'connected',
    cors: 'enabled for 192.168.1.146',
    timestamp: new Date().toISOString()
  });
});

// Start server
const PORT = process.env.PORT || 5000;

// Enhanced server startup
const startServer = async () => {
  try {
    log('🔗 Connecting to database...');
    
    // Database connection logic
    await db.sequelize.authenticate();
    log('✅ Database connection established successfully');
    
    // Model sync logic
    log('📊 Creating/updating database tables...');
    await db.sequelize.sync(); // no force = just create if not exists
    log('✅ All models synchronized successfully');
    
    server.listen(PORT, '0.0.0.0', () => {
      log(`🚀 Server running on port ${PORT}`);
      log(`🌐 Server accessible at:`);
      log(`   - http://localhost:${PORT}`);
      log(`   - http://192.168.1.146:${PORT}`);
      log('📡 Socket.io ready for real-time chat');
      log(`🔍 Health check available at http://192.168.1.146:${PORT}/health`);
      log(`🎯 CORS configured for React Native on 192.168.1.146`);
    });
  } catch (err) {
    log('❌ Database connection/sync error:', err.message);
    log('🔄 Retrying in 5 seconds...');
    setTimeout(startServer, 5000);
  }
};

startServer();

// Enhanced graceful shutdown
const gracefulShutdown = () => {
  log('📡 Shutting down server gracefully...');
  
  // Clear cleanup interval
  clearInterval(cleanupInterval);
  
  // Clear all typing timeouts
  typingTimeouts.forEach(timeout => clearTimeout(timeout));
  typingTimeouts.clear();
  
  // Notify users about shutdown
  activeConnections.forEach((connection) => {
    if (connection.socket && connection.socket.connected) {
      connection.socket.emit('serverShutdown', {
        message: 'Server is shutting down for maintenance',
        timestamp: new Date().toISOString()
      });
    }
  });
  
  // Shutdown logic
  io.close(() => {
    log('✅ All socket connections closed');
  });
  
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

// Signal handlers
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Error handlers
process.on('unhandledRejection', (err) => {
  log('❌ UNHANDLED REJECTION:', err.message);
  console.error(err);
});

process.on('uncaughtException', (err) => {
  log('❌ UNCAUGHT EXCEPTION:', err.message);
  console.error(err);
  gracefulShutdown();
});

// Export with enhancements
module.exports = { 
  server, 
  io, 
  activeConnections, 
  roomMembers,
  userRooms,
  typingTimeouts
};