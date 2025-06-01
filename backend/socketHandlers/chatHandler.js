// socketHandlers/chatHandler.js - Fixed version with message history loading
const jwt = require('jsonwebtoken');
const { SupportRoom, SupportMessage, User } = require('../models');
const { Op } = require('sequelize');

// Store active connections
const activeConnections = new Map();
const roomMembers = new Map();

// Helper function for logging
const log = (message, data = '') => {
  console.log(`[${new Date().toISOString()}] ${message}`, data);
};

// Socket authentication middleware with better error handling
const authenticateSocket = async (socket, next) => {
  try {
    // Get token from various possible locations
    const token = socket.handshake.auth.token || 
                 socket.handshake.query.token ||
                 socket.handshake.headers.authorization?.replace('Bearer ', '');
    
    log(`🔐 Socket authentication attempt for ${socket.id}: ${token ? 'Token present' : 'No token'}`);
    
    if (!token) {
      log('❌ No token provided for socket authentication');
      return next(new Error('Authentication required'));
    }

    // Verify JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      log('❌ JWT verification failed:', jwtError.message);
      if (jwtError.name === 'TokenExpiredError') {
        return next(new Error('Token expired'));
      }
      return next(new Error('Invalid token'));
    }

    // Find user in database
    const user = await User.findByPk(decoded.id, {
      attributes: ['id', 'name', 'email', 'profileImage', 'role', 'active']
    });
    
    if (!user) {
      log('❌ User not found:', decoded.id);
      return next(new Error('User not found'));
    }

    if (!user.active) {
      log('❌ User account inactive:', decoded.id);
      return next(new Error('Account inactive'));
    }

    // Attach user data to socket
    socket.userId = user.id;
    socket.user = user.toJSON();
    socket.authenticated = true;
    
    log(`✅ Socket authenticated for user: ${user.name} (${user.id})`);
    next();
    
  } catch (error) {
    log('❌ Socket authentication error:', error.message);
    next(new Error('Authentication failed'));
  }
};

// Validate room access
const validateRoomAccess = async (userId, roomId) => {
  try {
    const room = await SupportRoom.findByPk(roomId, {
      include: [{
        model: User,
        as: 'participants',
        where: { id: userId },
        attributes: ['id'],
        through: { attributes: [] }
      }]
    });
    return room;
  } catch (error) {
    log('❌ Room validation error:', error.message);
    return null;
  }
};

// Load recent messages for a room
const loadRoomMessages = async (roomId, limit = 50) => {
  try {
    const messages = await SupportMessage.findAll({
      where: { roomId },
      include: [{
        model: User,
        as: 'sender',
        attributes: ['id', 'name', 'profileImage', 'role']
      }],
      order: [['createdAt', 'DESC']],
      limit
    });

    return messages.reverse(); // Return in chronological order (oldest first)
  } catch (error) {
    log('❌ Error loading room messages:', error.message);
    return [];
  }
};

// Main chat handler setup
const setupChatHandlers = (io) => {
  // Apply authentication middleware
  io.use(authenticateSocket);

  // Handle authentication errors
  io.engine.on("connection_error", (err) => {
    log('❌ Socket.IO connection error:', {
      message: err.message,
      description: err.description,
      context: err.context,
      type: err.type
    });
  });

  io.on('connection', (socket) => {
    log(`🔌 User ${socket.user.name} (${socket.userId}) connected to chat`);
    
    // Store connection with additional metadata
    activeConnections.set(socket.userId, {
      socketId: socket.id,
      socket: socket,
      user: socket.user,
      rooms: new Set(),
      joinTime: new Date(),
      messageCount: 0,
      lastActivity: new Date()
    });

    // Send connection confirmation with user data
    socket.emit('chatConnected', {
      success: true,
      userId: socket.userId,
      user: socket.user,
      timestamp: new Date().toISOString(),
      message: 'Successfully connected to chat server'
    });

    // Handle joining a room
    socket.on('joinRoom', async (data) => {
      try {
        const { roomId } = data;
        log(`🚪 User ${socket.user.name} attempting to join room: ${roomId}`);
        
        if (!roomId) {
          socket.emit('error', { 
            message: 'Room ID is required',
            code: 'MISSING_ROOM_ID',
            timestamp: new Date().toISOString()
          });
          return;
        }

        // Validate room access
        const room = await validateRoomAccess(socket.userId, roomId);
        if (!room) {
          log(`❌ Room ${roomId} not found or access denied for user ${socket.userId}`);
          socket.emit('error', { 
            message: 'Room not found or access denied',
            code: 'ROOM_ACCESS_DENIED',
            roomId: parseInt(roomId),
            timestamp: new Date().toISOString()
          });
          return;
        }

        // Get full room data with participants
        const fullRoom = await SupportRoom.findByPk(roomId, {
          include: [{
            model: User,
            as: 'participants',
            attributes: ['id', 'name', 'profileImage', 'role'],
            through: { attributes: [] }
          }]
        });

        // **FIXED: Load message history when joining room**
        const messageHistory = await loadRoomMessages(roomId, 50);
        log(`📚 Loaded ${messageHistory.length} messages for room ${roomId}`);

        // Join the Socket.IO room
        await socket.join(`room_${roomId}`);
        
        // Update connection tracking
        const userConnection = activeConnections.get(socket.userId);
        if (userConnection) {
          userConnection.rooms.add(parseInt(roomId));
          userConnection.lastActivity = new Date();
        }

        // Update room members tracking
        const roomKey = roomId.toString();
        if (!roomMembers.has(roomKey)) {
          roomMembers.set(roomKey, new Set());
        }
        roomMembers.get(roomKey).add(socket.userId);

        // Mark messages as read for current user (when joining)
        await SupportMessage.update(
          { isRead: true },
          {
            where: {
              roomId: parseInt(roomId),
              senderId: { [Op.ne]: socket.userId },
              isRead: false
            }
          }
        );

        log(`✅ User ${socket.user.name} successfully joined room ${roomId}`);
        
        // Notify other room members
        socket.to(`room_${roomId}`).emit('userJoinedRoom', {
          roomId: parseInt(roomId),
          user: {
            id: socket.user.id,
            name: socket.user.name,
            profileImage: socket.user.profileImage,
            role: socket.user.role
          },
          timestamp: new Date().toISOString()
        });

        // **FIXED: Send room data WITH message history**
        socket.emit('roomJoined', { 
          success: true,
          roomId: parseInt(roomId),
          room: {
            id: fullRoom.id,
            name: fullRoom.name,
            type: fullRoom.type,
            active: fullRoom.active,
            createdAt: fullRoom.createdAt,
            updatedAt: fullRoom.updatedAt
          },
          participants: fullRoom.participants,
          messages: messageHistory, // Include message history
          onlineUsers: getOnlineUsersInRoom(roomId),
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        log('❌ Error joining room:', error.message);
        socket.emit('error', { 
          message: 'Failed to join room', 
          error: error.message,
          code: 'JOIN_ROOM_ERROR',
          timestamp: new Date().toISOString()
        });
      }
    });

    // Handle leaving a room
    socket.on('leaveRoom', async (data) => {
      try {
        const { roomId } = data;
        log(`🚪 User ${socket.user.name} leaving room: ${roomId}`);

        if (!roomId) {
          socket.emit('error', {
            message: 'Room ID is required',
            code: 'MISSING_ROOM_ID',
            timestamp: new Date().toISOString()
          });
          return;
        }

        await socket.leave(`room_${roomId}`);
        
        // Update tracking
        const userConnection = activeConnections.get(socket.userId);
        if (userConnection) {
          userConnection.rooms.delete(parseInt(roomId));
          userConnection.lastActivity = new Date();
        }

        // Update room members
        const roomKey = roomId.toString();
        if (roomMembers.has(roomKey)) {
          roomMembers.get(roomKey).delete(socket.userId);
        }

        // Notify other room members
        socket.to(`room_${roomId}`).emit('userLeftRoom', {
          roomId: parseInt(roomId),
          userId: socket.userId,
          userName: socket.user.name,
          timestamp: new Date().toISOString()
        });

        socket.emit('roomLeft', { 
          success: true,
          roomId: parseInt(roomId), 
          timestamp: new Date().toISOString() 
        });

        log(`✅ User ${socket.user.name} left room ${roomId}`);

      } catch (error) {
        log('❌ Error leaving room:', error.message);
        socket.emit('error', { 
          message: 'Failed to leave room', 
          error: error.message,
          code: 'LEAVE_ROOM_ERROR',
          timestamp: new Date().toISOString()
        });
      }
    });

    // Handle sending messages
    socket.on('sendMessage', async (data) => {
      try {
        const { roomId, content } = data;
        log(`📤 User ${socket.user.name} sending message to room ${roomId}`);

        if (!roomId || !content || content.trim().length === 0) {
          socket.emit('error', { 
            message: 'Room ID and message content are required',
            code: 'INVALID_MESSAGE_DATA',
            timestamp: new Date().toISOString()
          });
          return;
        }

        // Validate room access
        const room = await validateRoomAccess(socket.userId, roomId);
        if (!room) {
          socket.emit('error', { 
            message: 'Room not found or access denied',
            code: 'ROOM_ACCESS_DENIED',
            roomId: parseInt(roomId),
            timestamp: new Date().toISOString()
          });
          return;
        }

        // Create message in database
        const message = await SupportMessage.create({
          content: content.trim(),
          roomId: parseInt(roomId),
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

        // Format message for emission
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
          success: true,
          message: formattedMessage,
          roomId: parseInt(roomId),
          timestamp: new Date().toISOString()
        });

        // Send confirmation to sender
        socket.emit('messageSent', {
          success: true,
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
          code: 'SEND_MESSAGE_ERROR',
          timestamp: new Date().toISOString()
        });
      }
    });

    // Handle typing indicators
    socket.on('typing', (data) => {
      try {
        const { roomId, isTyping } = data;
        
        if (!roomId) {
          socket.emit('error', {
            message: 'Room ID is required for typing indicator',
            code: 'MISSING_ROOM_ID',
            timestamp: new Date().toISOString()
          });
          return;
        }

        // Update user activity
        const userConnection = activeConnections.get(socket.userId);
        if (userConnection) {
          userConnection.lastActivity = new Date();
        }

        socket.to(`room_${roomId}`).emit('userTyping', {
          roomId: parseInt(roomId),
          userId: socket.userId,
          userName: socket.user.name,
          isTyping: !!isTyping,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        log('❌ Error handling typing indicator:', error.message);
      }
    });

    // Handle message read status
    socket.on('markMessagesRead', async (data) => {
      try {
        const { roomId } = data;
        
        if (!roomId) {
          socket.emit('error', {
            message: 'Room ID is required',
            code: 'MISSING_ROOM_ID',
            timestamp: new Date().toISOString()
          });
          return;
        }

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

        // Notify other room members
        socket.to(`room_${roomId}`).emit('messagesRead', {
          roomId: parseInt(roomId),
          userId: socket.userId,
          readBy: socket.user.name,
          timestamp: new Date().toISOString()
        });

        socket.emit('messagesMarkedRead', {
          success: true,
          roomId: parseInt(roomId),
          count: updatedCount,
          timestamp: new Date().toISOString()
        });

        log(`✅ Marked ${updatedCount} messages as read in room ${roomId}`);

      } catch (error) {
        log('❌ Error marking messages as read:', error.message);
        socket.emit('error', { 
          message: 'Failed to mark messages as read',
          code: 'MARK_READ_ERROR',
          timestamp: new Date().toISOString()
        });
      }
    });

    // Handle ping/pong for connection health
    socket.on('ping', (data) => {
      try {
        socket.emit('pong', {
          ...data,
          serverTime: new Date().toISOString(),
          userId: socket.userId,
          socketId: socket.id
        });
        
        // Update last activity
        const userConnection = activeConnections.get(socket.userId);
        if (userConnection) {
          userConnection.lastActivity = new Date();
        }
      } catch (error) {
        log('❌ Error handling ping:', error.message);
      }
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      log(`❌ User ${socket.user.name} (${socket.userId}) disconnected: ${reason}`);
      
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

          // Clean up room members
          const roomKey = roomId.toString();
          if (roomMembers.has(roomKey)) {
            roomMembers.get(roomKey).delete(socket.userId);
          }
        });
      }
      
      // Remove from active connections
      activeConnections.delete(socket.userId);
    });

    // Handle general errors
    socket.on('error', (error) => {
      log('❌ Socket error:', error);
      socket.emit('error', {
        message: 'Socket error occurred',
        code: 'SOCKET_ERROR',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    });
  });
};

// Utility functions
const getOnlineUsersInRoom = (roomId) => {
  const onlineUsers = [];
  activeConnections.forEach((connection, userId) => {
    if (connection.rooms.has(parseInt(roomId))) {
      onlineUsers.push({
        id: userId,
        name: connection.user.name,
        profileImage: connection.user.profileImage,
        role: connection.user.role,
        lastActivity: connection.lastActivity
      });
    }
  });
  return onlineUsers;
};

const getConnectionStats = () => {
  return {
    totalConnections: activeConnections.size,
    totalRooms: roomMembers.size,
    connections: Array.from(activeConnections.entries()).map(([userId, conn]) => ({
      userId,
      userName: conn.user.name,
      socketId: conn.socketId,
      rooms: Array.from(conn.rooms),
      messageCount: conn.messageCount,
      joinTime: conn.joinTime,
      lastActivity: conn.lastActivity
    }))
  };
};

module.exports = {
  setupChatHandlers,
  getOnlineUsersInRoom,
  getConnectionStats,
  activeConnections
};