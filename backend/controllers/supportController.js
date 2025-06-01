// controllers/supportController.js - FIXED VERSION (Sequelize Only)
const { SupportRoom, SupportMessage, User, sequelize } = require('../models');
const { Op } = require('sequelize');

// Create support room
exports.createSupportRoom = async (req, res) => {
  try {
    const { name, type = 'one-on-one', participantIds = [] } = req.body;
    const currentUserId = req.user.id;

    console.log('🔄 Creating room:', { name, type, participantIds, currentUserId });

    // Validate input
    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Room name is required'
      });
    }

    // For one-on-one chats, ensure only 2 participants
    if (type === 'one-on-one' && participantIds.length !== 1) {
      return res.status(400).json({
        status: 'error',
        message: 'One-on-one chat requires exactly one other participant'
      });
    }

    // FIXED: Check if one-on-one room already exists using Sequelize
    if (type === 'one-on-one') {
      const otherUserId = participantIds[0];
      
      console.log('🔍 Checking for existing room between users:', currentUserId, 'and', otherUserId);
      
      // Get all one-on-one rooms that include the current user
      const userRooms = await SupportRoom.findAll({
        where: { 
          type: 'one-on-one',
          active: true 
        },
        include: [{
          model: User,
          as: 'participants',
          attributes: ['id'],
          where: { id: currentUserId },
          through: { attributes: [] }
        }]
      });

      console.log('🔍 Found', userRooms.length, 'existing one-on-one rooms for current user');

      // Check each room to see if it contains exactly the two users we want
      for (const room of userRooms) {
        // Get all participants for this room
        const roomWithParticipants = await SupportRoom.findByPk(room.id, {
          include: [{
            model: User,
            as: 'participants',
            attributes: ['id'],
            through: { attributes: [] }
          }]
        });

        const participantIds_in_room = roomWithParticipants.participants.map(p => p.id);
        
        // Check if this room has exactly these two users
        if (participantIds_in_room.length === 2 && 
            participantIds_in_room.includes(currentUserId) && 
            participantIds_in_room.includes(otherUserId)) {
          
          console.log('✅ Found existing room:', room.id);
          
          // Fetch complete room data with all participant details
          const completeRoom = await SupportRoom.findByPk(room.id, {
            include: [{
              model: User,
              as: 'participants',
              attributes: ['id', 'name', 'email', 'profileImage', 'role']
            }]
          });

          // Add otherParticipants field
          const roomData = completeRoom.toJSON();
          roomData.otherParticipants = roomData.participants.filter(p => p.id !== currentUserId);

          return res.status(200).json({
            status: 'success',
            message: 'Room already exists',
            data: { room: roomData }
          });
        }
      }

      console.log('🔍 No existing room found between these users');
    }

    console.log('🆕 Creating new room...');

    // Create new room
    const room = await SupportRoom.create({
      name: name.trim(),
      type
    });

    // Add participants to room
    const allParticipantIds = [currentUserId, ...participantIds];
    console.log('👥 Adding participants:', allParticipantIds);
    
    const participants = await User.findAll({
      where: { id: { [Op.in]: allParticipantIds } }
    });

    console.log('👥 Found', participants.length, 'users to add as participants');

    await room.addParticipants(participants);

    // Fetch the complete room data with participants
    const completeRoom = await SupportRoom.findByPk(room.id, {
      include: [{
        model: User,
        as: 'participants',
        attributes: ['id', 'name', 'email', 'profileImage', 'role']
      }]
    });

    // Add otherParticipants field
    const roomData = completeRoom.toJSON();
    roomData.otherParticipants = roomData.participants.filter(p => p.id !== currentUserId);

    console.log('✅ Room created successfully:', room.id, 'with', roomData.participants.length, 'participants');

    res.status(201).json({
      status: 'success',
      message: 'Support room created successfully',
      data: { room: roomData }
    });
  } catch (err) {
    console.error('❌ Create support room error:', err);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create support room'
    });
  }
};

// Get user's support rooms
exports.getUserRooms = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    console.log('📥 Fetching rooms for user:', userId);

    // Get rooms where user is a participant
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

    // Calculate unread message count and get latest message for each room
    const roomsWithUnread = await Promise.all(
      rooms.rows.map(async (room) => {
        // Get latest message for this room
        const latestMessage = await SupportMessage.findOne({
          where: { roomId: room.id },
          include: [{
            model: User,
            as: 'sender',
            attributes: ['id', 'name', 'profileImage']
          }],
          order: [['createdAt', 'DESC']]
        });

        // Get unread count for this room
        const unreadCount = await SupportMessage.count({
          where: {
            roomId: room.id,
            senderId: { [Op.ne]: userId },
            isRead: false
          }
        });

        const roomData = room.toJSON();
        roomData.unreadCount = unreadCount;
        roomData.messages = latestMessage ? [latestMessage] : [];
        
        // Get the other participants (exclude current user)
        roomData.otherParticipants = roomData.participants.filter(p => p.id !== userId);
        
        console.log('📊 Room', room.id, '- Unread:', unreadCount, 'Participants:', roomData.participants.length);
        
        return roomData;
      })
    );

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

// Get room messages
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

    // Get messages
    const messages = await SupportMessage.findAndCountAll({
      where: { roomId },
      include: [{
        model: User,
        as: 'sender',
        attributes: ['id', 'name', 'profileImage', 'role']
      }],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    console.log('📝 Found', messages.count, 'messages in room');

    // Mark messages as read for current user
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

    res.status(200).json({
      status: 'success',
      data: {
        messages: messages.rows.reverse(), // Reverse to show oldest first
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

// Send message
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
      roomId,
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

// Join room (for verification)
exports.joinRoom = async (req, res) => {
  try {
    const { id: roomId } = req.params;
    const userId = req.user.id;

    console.log('🚪 User', userId, 'attempting to join room:', roomId);

    // Verify user is participant in this room
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

    // Add otherParticipants field
    const roomData = room.toJSON();
    roomData.otherParticipants = roomData.participants.filter(p => p.id !== userId);

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