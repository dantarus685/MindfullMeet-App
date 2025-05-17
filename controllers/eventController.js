// controllers/eventController.js
const { Event, User, RSVP, Comment } = require('../models');
const { validationResult } = require('express-validator');

// Get all events with filtering
exports.getAllEvents = async (req, res) => {
  try {
    const { 
      eventType, 
      startDate, 
      endDate, 
      isOnline,
      search 
    } = req.query;
    
    // Build filter object
    const filter = {};
    
    if (eventType) {
      filter.eventType = eventType;
    }
    
    if (isOnline !== undefined) {
      filter.isOnline = isOnline === 'true';
    }
    
    // Date filtering
    if (startDate || endDate) {
      filter.startTime = {};
      if (startDate) {
        filter.startTime[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        filter.startTime[Op.lte] = new Date(endDate);
      }
    }
    
    // Search by title or description
    if (search) {
      filter[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }
    
    const events = await Event.findAll({
      where: filter,
      include: [
        {
          model: User,
          as: 'host',
          attributes: ['id', 'name', 'profileImage']
        }
      ],
      order: [['startTime', 'ASC']]
    });
    
    res.status(200).json({
      status: 'success',
      results: events.length,
      data: {
        events
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching events'
    });
  }
};

// Get single event
exports.getEvent = async (req, res) => {
  try {
    const event = await Event.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'host',
          attributes: ['id', 'name', 'profileImage', 'bio']
        },
        {
          model: RSVP,
          as: 'rsvps',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'name', 'profileImage']
            }
          ]
        }
      ]
    });
    
    if (!event) {
      return res.status(404).json({
        status: 'fail',
        message: 'Event not found'
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        event
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching event'
    });
  }
};

// Create new event
exports.createEvent = async (req, res) => {
  try {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'fail',
        errors: errors.array()
      });
    }
    
    // Create event
    const newEvent = await Event.create({
      ...req.body,
      hostId: req.user.id // From auth middleware
    });
    
    res.status(201).json({
      status: 'success',
      data: {
        event: newEvent
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: 'error',
      message: 'Server error while creating event'
    });
  }
};

// Update event
exports.updateEvent = async (req, res) => {
  try {
    const event = await Event.findByPk(req.params.id);
    
    if (!event) {
      return res.status(404).json({
        status: 'fail',
        message: 'Event not found'
      });
    }
    
    // Check if user is the host
    if (event.hostId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'fail',
        message: 'You can only update events that you host'
      });
    }
    
    // Update event
    await event.update(req.body);
    
    res.status(200).json({
      status: 'success',
      data: {
        event
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: 'error',
      message: 'Server error while updating event'
    });
  }
};

// Delete event
exports.deleteEvent = async (req, res) => {
  try {
    const event = await Event.findByPk(req.params.id);
    
    if (!event) {
      return res.status(404).json({
        status: 'fail',
        message: 'Event not found'
      });
    }
    
    // Check if user is the host
    if (event.hostId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'fail',
        message: 'You can only delete events that you host'
      });
    }
    
    // Soft delete by marking as inactive
    await event.update({ active: false });
    
    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: 'error',
      message: 'Server error while deleting event'
    });
  }
};

// Get event type statistics
exports.getEventTypeStats = async (req, res) => {
  try {
    const stats = await Event.findAll({
      attributes: [
        'eventType',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['eventType']
    });
    
    res.status(200).json({
      status: 'success',
      data: {
        stats
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching event stats'
    });
  }
};

// Create RSVP for an event
exports.createRSVP = async (req, res) => {
  try {
    const { status } = req.body;
    const eventId = req.params.id;
    const userId = req.user.id;
    
    // Check if event exists
    const event = await Event.findByPk(eventId);
    if (!event) {
      return res.status(404).json({
        status: 'fail',
        message: 'Event not found'
      });
    }
    
    // Check if user already RSVP'd
    let rsvp = await RSVP.findOne({
      where: {
        eventId,
        userId
      }
    });
    
    if (rsvp) {
      // Update existing RSVP
      rsvp = await rsvp.update({ status });
    } else {
      // Create new RSVP
      rsvp = await RSVP.create({
        eventId,
        userId,
        status: status || 'going'
      });
    }
    
    res.status(201).json({
      status: 'success',
      data: {
        rsvp
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: 'error',
      message: 'Server error while creating RSVP'
    });
  }
};

// Get attendees for an event
exports.getEventAttendees = async (req, res) => {
  try {
    const rsvps = await RSVP.findAll({
      where: {
        eventId: req.params.id,
        status: 'going'
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'profileImage']
        }
      ]
    });
    
    res.status(200).json({
      status: 'success',
      results: rsvps.length,
      data: {
        attendees: rsvps
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching attendees'
    });
  }
};

// Create comment for an event
exports.createComment = async (req, res) => {
  try {
    const { content, parentCommentId } = req.body;
    const eventId = req.params.id;
    const userId = req.user.id;
    
    // Check if event exists
    const event = await Event.findByPk(eventId);
    if (!event) {
      return res.status(404).json({
        status: 'fail',
        message: 'Event not found'
      });
    }
    
    // Create comment
    const comment = await Comment.create({
      content,
      eventId,
      userId,
      parentCommentId: parentCommentId || null
    });
    
    // Get comment with user data
    const commentWithUser = await Comment.findByPk(comment.id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'profileImage']
        }
      ]
    });
    
    res.status(201).json({
      status: 'success',
      data: {
        comment: commentWithUser
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: 'error',
      message: 'Server error while creating comment'
    });
  }
};

// Get comments for an event
exports.getEventComments = async (req, res) => {
  try {
    const comments = await Comment.findAll({
      where: {
        eventId: req.params.id,
        parentCommentId: null // Only get top-level comments
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'profileImage']
        },
        {
          model: Comment,
          as: 'replies',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'name', 'profileImage']
            }
          ]
        }
      ],
      order: [
        ['createdAt', 'DESC'],
        [{ model: Comment, as: 'replies' }, 'createdAt', 'ASC']
      ]
    });
    
    res.status(200).json({
      status: 'success',
      results: comments.length,
      data: {
        comments
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching comments'
    });
  }
};