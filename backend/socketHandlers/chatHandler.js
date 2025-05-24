// socketHandlers/chatHandler.js
const jwt = require('jsonwebtoken');
const { SupportRoom, SupportMessage, User } = require('../models');
const { Op } = require('sequelize');

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

// Main chat handler
const setupChatHandlers = (io) => {
  // Apply authentication middleware
  io.use(authenticateSocket);

  io.on('connection', (socket) => {
    console.log(`User ${socket.user.name} (${socket.userId}) connected to chat`);
    
    // Store connection
    activeConnections.set(socket.userId, {
      socketId: socket.id,
      user: socket.user,
      rooms: new Set()
    });

    // Emit user online status to all rooms they're part of
    emitUserStatusToRooms(socket.userId, 'online', io);

    // Handle joining a room
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

        // Join the room
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

        // Confirm to user
        socket.emit('roomJoined', { roomId });
      } catch (error) {
        console.error('Error joining room:', error);
        socket.emit('error', { message: 'Failed to join room' });
      }
    });

    // Handle leaving a room
    socket.on('leaveRoom', (data) => {
      const { roomId } = data;
      socket.leave(`room_${roomId}`);
      
      // Update tracking
      const userConnection = activeConnections.get(socket.userId);
      if (userConnection) {
        userConnection.rooms.delete(roomId);
      }

      // Notify other room members
      socket.to(`room_${roomId}`).emit('userLeftRoom', {
        roomId,
        userId: socket.userId
      });

      console.log(`User ${socket.user.name} left room ${roomId}`);
    });

    // Handle sending messages
    socket.on('sendMessage', async (data) => {
      try {
        const { roomId, content } = data;

        // Validate input
        if (!content || content.trim().length === 0) {
          socket.emit('error', { message: 'Message content is required' });
          return;
        }

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

        // Send push notifications to offline users
        await sendNotificationsToOfflineUsers(roomId, socket.userId, content, io);

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
        
        // Mark messages as read
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

        // Notify other room members
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
      console.log(`User ${socket.user.name} (${socket.userId}) disconnected from chat`);
      
      // Remove from active connections
      activeConnections.delete(socket.userId);
      
      // Emit user offline status to all rooms they were part of
      emitUserStatusToRooms(socket.userId, 'offline', io);
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  });
};

// Helper function to emit user status to rooms
const emitUserStatusToRooms = async (userId, status, io) => {
  try {
    const userRooms = await SupportRoom.findAll({
      include: [{
        model: User,
        as: 'participants',
        where: { id: userId },
        attributes: [],
        through: { attributes: [] }
      }]
    });

    userRooms.forEach(room => {
      io.to(`room_${room.id}`).emit('userStatusChange', {
        userId,
        status,
        roomId: room.id
      });
    });
  } catch (error) {
    console.error('Error emitting user status:', error);
  }
};

// Helper function to send notifications to offline users
const sendNotificationsToOfflineUsers = async (roomId, senderId, content, io) => {
  try {
    // Get all participants in the room except sender
    const room = await SupportRoom.findByPk(roomId, {
      include: [{
        model: User,
        as: 'participants',
        where: { id: { [Op.ne]: senderId } },
        attributes: ['id', 'name', 'email']
      }]
    });

    if (room) {
      const offlineUsers = room.participants.filter(user => 
        !activeConnections.has(user.id)
      );

      // Here you can implement push notifications, email notifications, etc.
      offlineUsers.forEach(user => {
        // TODO: Implement push notification service
        console.log(`Send notification to offline user ${user.name}: ${content.substring(0, 50)}...`);
      });
    }
  } catch (error) {
    console.error('Error sending notifications:', error);
  }
};

// Get online users in a room
const getOnlineUsersInRoom = (roomId) => {
  const onlineUsers = [];
  activeConnections.forEach((connection, userId) => {
    if (connection.rooms.has(roomId)) {
      onlineUsers.push({
        id: userId,
        name: connection.user.name,
        profileImage: connection.user.profileImage
      });
    }
  });
  return onlineUsers;
};

module.exports = {
  setupChatHandlers,
  getOnlineUsersInRoom,
  activeConnections
};