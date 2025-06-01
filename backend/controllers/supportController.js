// controllers/supportController.js - IMPROVED VERSION
const { SupportRoom, SupportMessage, User, sequelize } = require('../models');
const { Op } = require('sequelize');

// Create support room with transaction and better duplicate handling
exports.createSupportRoom = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { name, type = 'one-on-one', participantIds = [] } = req.body;
    const currentUserId = req.user.id;

    console.log('🔄 Creating room:', { name, type, participantIds, currentUserId });

    // Validate input
    if (!name || name.trim().length === 0) {
      await transaction.rollback();
      return res.status(400).json({
        status: 'error',
        message: 'Room name is required'
      });
    }

    // For one-on-one chats, ensure only 2 participants
    if (type === 'one-on-one' && participantIds.length !== 1) {
      await transaction.rollback();
      return res.status(400).json({
        status: 'error',
        message: 'One-on-one chat requires exactly one other participant'
      });
    }

    // IMPROVED: Better duplicate room check for one-on-one
    if (type === 'one-on-one') {
      const otherUserId = participantIds[0];
      
      console.log('🔍 Checking for existing room between users:', currentUserId, 'and', otherUserId);
      
      // Use a more efficient query to find existing room
      const existingRoom = await sequelize.query(`
        SELECT sr.id, sr.name, sr.type, sr.active, sr.createdAt, sr.updatedAt
        FROM support_rooms sr
        INNER JOIN UserRooms ur1 ON sr.id = ur1.roomId AND ur1.userId = :currentUserId
        INNER JOIN UserRooms ur2 ON sr.id = ur2.roomId AND ur2.userId = :otherUserId
        WHERE sr.type = 'one-on-one' AND sr.active = true
        AND (
          SELECT COUNT(*) FROM UserRooms ur3 WHERE ur3.roomId = sr.id
        ) = 2
        LIMIT 1
      `, {
        replacements: { currentUserId, otherUserId },
        type: sequelize.QueryTypes.SELECT,
        transaction
      });

      if (existingRoom.length > 0) {
        console.log('✅ Found existing room:', existingRoom[0].id);
        
        // Fetch complete room data with participants and recent messages
        const completeRoom = await SupportRoom.findByPk(existingRoom[0].id, {
          include: [
            {
              model: User,
              as: 'participants',
              attributes: ['id', 'name', 'email', 'profileImage', 'role']
            },
            {
              model: SupportMessage,
              as: 'messages',
              limit: 1,
              order: [['createdAt', 'DESC']],
              include: [{
                model: User,
                as: 'sender',
                attributes: ['id', 'name', 'profileImage']
              }]
            }
          ],
          transaction
        });

        const roomData = completeRoom.toJSON();
        roomData.otherParticipants = roomData.participants.filter(p => p.id !== currentUserId);
        
        // Get unread count
        const unreadCount = await SupportMessage.count({
          where: {
            roomId: completeRoom.id,
            senderId: { [Op.ne]: currentUserId },
            isRead: false
          },
          transaction
        });
        
        roomData.unreadCount = unreadCount;

        await transaction.commit();
        
        return res.status(200).json({
          status: 'success',
          message: 'Room already exists',
          data: { room: roomData }
        });
      }

      console.log('🔍 No existing room found between these users');
    }

    console.log('🆕 Creating new room...');

    // Create new room within transaction
    const room = await SupportRoom.create({
      name: name.trim(),
      type
    }, { transaction });

    // Add participants to room
    const allParticipantIds = [currentUserId, ...participantIds];
    console.log('👥 Adding participants:', allParticipantIds);
    
    const participants = await User.findAll({
      where: { id: { [Op.in]: allParticipantIds } },
      transaction
    });

    console.log('👥 Found', participants.length, 'users to add as participants');

    await room.addParticipants(participants, { transaction });

    // Fetch the complete room data with participants
    const completeRoom = await SupportRoom.findByPk(room.id, {
      include: [{
        model: User,
        as: 'participants',
        attributes: ['id', 'name', 'email', 'profileImage', 'role']
      }],
      transaction
    });

    // Add otherParticipants field
    const roomData = completeRoom.toJSON();
    roomData.otherParticipants = roomData.participants.filter(p => p.id !== currentUserId);
    roomData.unreadCount = 0;
    roomData.messages = [];

    await transaction.commit();

    console.log('✅ Room created successfully:', room.id, 'with', roomData.participants.length, 'participants');

    res.status(201).json({
      status: 'success',
      message: 'Support room created successfully',
      data: { room: roomData }
    });
  } catch (err) {
    await transaction.rollback();
    console.error('❌ Create support room error:', err);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create support room'
    });
  }
};

// Get user's support rooms with better optimization
exports.getUserRooms = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    console.log('📥 Fetching rooms for user:', userId);

    // Get rooms where user is a participant with better query
    const rooms = await SupportRoom.findAndCountAll({
      where: { active: true },
      include: [
        {
          model: User,
          as: 'participants',
          where: { id: userId },
          attributes: [],
          through: { attributes: [] }
        },
        {
          model: User,
          as: 'participants',
          attributes: ['id', 'name', 'email', 'profileImage', 'role'],
          through: { attributes: [] }
        }
      ],
      order: [['updatedAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
      distinct: true
    });

    console.log('📋 Found', rooms.count, 'rooms for user');

    // Optimize: Get all latest messages and unread counts in batch
    const roomIds = rooms.rows.map(room => room.id);
    
    // Get latest messages for all rooms
    const latestMessages = await SupportMessage.findAll({
      where: {
        roomId: { [Op.in]: roomIds }
      },
      include: [{
        model: User,
        as: 'sender',
        attributes: ['id', 'name', 'profileImage']
      }],
      order: [['roomId', 'ASC'], ['createdAt', 'DESC']],
      group: ['roomId']
    });

    // Get unread counts for all rooms
    const unreadCounts = await SupportMessage.findAll({
      where: {
        roomId: { [Op.in]: roomIds },
        senderId: { [Op.ne]: userId },
        isRead: false
      },
      attributes: [
        'roomId',
        [sequelize.fn('COUNT', sequelize.col('id')), 'unreadCount']
      ],
      group: ['roomId'],
      raw: true
    });

    // Create lookup maps
    const messageMap = new Map();
    latestMessages.forEach(msg => {
      if (!messageMap.has(msg.roomId)) {
        messageMap.set(msg.roomId, msg);
      }
    });

    const unreadMap = new Map();
    unreadCounts.forEach(item => {
      unreadMap.set(item.roomId, parseInt(item.unreadCount));
    });

    // Process rooms with cached data
    const roomsWithUnread = rooms.rows.map(room => {
      const roomData = room.toJSON();
      roomData.unreadCount = unreadMap.get(room.id) || 0;
      roomData.messages = messageMap.has(room.id) ? [messageMap.get(room.id)] : [];
      roomData.otherParticipants = roomData.participants.filter(p => p.id !== userId);
      
      console.log('📊 Room', room.id, '- Unread:', roomData.unreadCount, 'Participants:', roomData.participants.length);
      
      return roomData;
    });

    res.status(200).json({
      status: 'success',
      data: {
        rooms: roomsWithUnread,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(rooms.count / limit),
          totalRooms: rooms.count,
          hasNext: offset + limit < rooms.count,
          hasPrev: page > 1
        }
      }
    });
  } catch (err) {
    console.error('❌ Get user rooms error:', err);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch user rooms'
    });
  }
};

// Get room messages with better pagination
exports.getRoomMessages = async (req, res) => {
  try {
    const { id: roomId } = req.params;
    const userId = req.user.id;
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    console.log('📨 Fetching messages for room:', roomId, 'user:', userId);

    // Verify user is participant in this room
    const room = await SupportRoom.findByPk(roomId, {
      include: [{
        model: User,
        as: 'participants',
        where: { id: userId },
        attributes: ['id'],
        through: { attributes: [] }
      }]
    });

    if (!room) {
      console.log('❌ Room not found or user not participant');
      return res.status(404).json({
        status: 'error',
        message: 'Room not found or you are not a participant'
      });
    }

    // Get messages with better ordering (newest first for pagination, then reverse)
    const messages = await SupportMessage.findAndCountAll({
      where: { roomId },
      include: [{
        model: User,
        as: 'sender',
        attributes: ['id', 'name', 'profileImage', 'role']
      }],
      order: [['createdAt', 'DESC']], // Get newest first
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    console.log('📝 Found', messages.count, 'messages in room');

    // Mark messages as read for current user (only unread messages from others)
    const readUpdate = await SupportMessage.update(
      { isRead: true },
      {
        where: {
          roomId,
          senderId: { [Op.ne]: userId },
          isRead: false
        }
      }
    );

    console.log('👁️ Marked', readUpdate[0], 'messages as read');

    // Return messages in chronological order (oldest first)
    const messagesInOrder = messages.rows.reverse();

    res.status(200).json({
      status: 'success',
      data: {
        messages: messagesInOrder,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(messages.count / limit),
          totalMessages: messages.count,
          hasNext: offset + limit < messages.count,
          hasPrev: page > 1
        }
      }
    });
  } catch (err) {
    console.error('❌ Get room messages error:', err);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch room messages'
    });
  }
};

// Send message with better validation
exports.sendMessage = async (req, res) => {
  try {
    const { id: roomId } = req.params;
    const { content } = req.body;
    const senderId = req.user.id;

    console.log('📤 Sending message to room:', roomId, 'from user:', senderId);

    // Validate input
    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Message content is required'
      });
    }

    if (content.trim().length > 1000) {
      return res.status(400).json({
        status: 'error',
        message: 'Message content too long (max 1000 characters)'
      });
    }

    // Verify user is participant in this room
    const room = await SupportRoom.findByPk(roomId, {
      include: [{
        model: User,
        as: 'participants',
        where: { id: senderId },
        attributes: ['id'],
        through: { attributes: [] }
      }]
    });

    if (!room) {
      console.log('❌ Room not found or user not participant');
      return res.status(404).json({
        status: 'error',
        message: 'Room not found or you are not a participant'
      });
    }

    // Create message
    const message = await SupportMessage.create({
      content: content.trim(),
      roomId: parseInt(roomId),
      senderId,
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

    // Update room's updated timestamp
    await room.update({ updatedAt: new Date() });

    console.log('✅ Message created:', message.id);

    res.status(201).json({
      status: 'success',
      message: 'Message sent successfully',
      data: { message: completeMessage }
    });
  } catch (err) {
    console.error('❌ Send message error:', err);
    res.status(500).json({
      status: 'error',
      message: 'Failed to send message'
    });
  }
};

// Join room (for verification) with room data
exports.joinRoom = async (req, res) => {
  try {
    const { id: roomId } = req.params;
    const userId = req.user.id;

    console.log('🚪 User', userId, 'attempting to join room:', roomId);

    // Verify user is participant and get complete room data
    const room = await SupportRoom.findByPk(roomId, {
      include: [{
        model: User,
        as: 'participants',
        attributes: ['id', 'name', 'profileImage', 'role'],
        through: { attributes: [] }
      }]
    });

    if (!room) {
      console.log('❌ Room not found');
      return res.status(404).json({
        status: 'error',
        message: 'Room not found'
      });
    }

    const isParticipant = room.participants.some(p => p.id === userId);
    if (!isParticipant) {
      console.log('❌ User not a participant');
      return res.status(403).json({
        status: 'error',
        message: 'You are not a participant in this room'
      });
    }

    // Get recent messages to show on join
    const recentMessages = await SupportMessage.findAll({
      where: { roomId },
      include: [{
        model: User,
        as: 'sender',
        attributes: ['id', 'name', 'profileImage', 'role']
      }],
      order: [['createdAt', 'DESC']],
      limit: 20
    });

    // Add room data with recent messages
    const roomData = room.toJSON();
    roomData.otherParticipants = roomData.participants.filter(p => p.id !== userId);
    roomData.recentMessages = recentMessages.reverse(); // Show in chronological order

    console.log('✅ User successfully joined room');

    res.status(200).json({
      status: 'success',
      data: { room: roomData }
    });
  } catch (err) {
    console.error('❌ Join room error:', err);
    res.status(500).json({
      status: 'error',
      message: 'Failed to join room'
    });
  }
};