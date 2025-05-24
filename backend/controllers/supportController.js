// controllers/supportController.js
const { SupportRoom, SupportMessage, User, sequelize } = require('../models');
const { Op } = require('sequelize');

// Create support room
exports.createSupportRoom = async (req, res) => {
  try {
    const { name, type = 'one-on-one', participantIds = [] } = req.body;
    const currentUserId = req.user.id;

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

    // Check if one-on-one room already exists between these users (simplified approach)
    if (type === 'one-on-one') {
      // Get all one-on-one rooms for current user
      const existingRooms = await SupportRoom.findAll({
        where: { type: 'one-on-one' },
        include: [{
          model: User,
          as: 'participants',
          attributes: ['id'],
          through: { attributes: [] }
        }]
      });

      // Check if any room has exactly these two participants
      for (const room of existingRooms) {
        const participantIds_in_room = room.participants.map(p => p.id);
        if (participantIds_in_room.length === 2 && 
            participantIds_in_room.includes(currentUserId) && 
            participantIds_in_room.includes(participantIds[0])) {
          
          // Fetch complete room data
          const completeRoom = await SupportRoom.findByPk(room.id, {
            include: [{
              model: User,
              as: 'participants',
              attributes: ['id', 'name', 'email', 'profileImage', 'role']
            }]
          });

          return res.status(200).json({
            status: 'success',
            message: 'Room already exists',
            data: { room: completeRoom }
          });
        }
      }
    }

    // Create new room
    const room = await SupportRoom.create({
      name: name.trim(),
      type
    });

    // Add participants to room
    const allParticipantIds = [currentUserId, ...participantIds];
    const participants = await User.findAll({
      where: { id: { [Op.in]: allParticipantIds } }
    });

    await room.addParticipants(participants);

    // Fetch the complete room data with participants
    const completeRoom = await SupportRoom.findByPk(room.id, {
      include: [{
        model: User,
        as: 'participants',
        attributes: ['id', 'name', 'email', 'profileImage', 'role']
      }]
    });

    res.status(201).json({
      status: 'success',
      message: 'Support room created successfully',
      data: { room: completeRoom }
    });
  } catch (err) {
    console.error('Create support room error:', err);
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

    // First get the rooms with participants
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
    console.error('Get user rooms error:', err);
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

    // Mark messages as read for current user
    await SupportMessage.update(
      { isRead: true },
      {
        where: {
          roomId,
          senderId: { [Op.ne]: userId },
          isRead: false
        }
      }
    );

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
    console.error('Get room messages error:', err);
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

    res.status(201).json({
      status: 'success',
      message: 'Message sent successfully',
      data: { message: completeMessage }
    });
  } catch (err) {
    console.error('Send message error:', err);
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
      return res.status(404).json({
        status: 'error',
        message: 'Room not found'
      });
    }

    const isParticipant = room.participants.some(p => p.id === userId);
    if (!isParticipant) {
      return res.status(403).json({
        status: 'error',
        message: 'You are not a participant in this room'
      });
    }

    res.status(200).json({
      status: 'success',
      data: { room }
    });
  } catch (err) {
    console.error('Join room error:', err);
    res.status(500).json({
      status: 'error',
      message: 'Failed to join room'
    });
  }
};