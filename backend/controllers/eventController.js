// controllers/eventController.js
const { Event, User, RSVP, Comment } = require('../models');
const { validationResult } = require('express-validator');
const { Op } = require('sequelize');

// Get all events (with pagination and filtering)
exports.getAllEvents = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      eventType, 
      searchTerm, 
      startDate, 
      endDate, 
      isOnline, 
      location,
      tags 
    } = req.query;

    // Build the query based on filters
    const query = { 
      where: { active: true },
      include: [
        {
          model: User,
          as: 'host',
          attributes: ['id', 'name', 'email', 'profileImage']
        },
        {
          model: RSVP,
          as: 'rsvps',
          attributes: ['id', 'status']
        }
      ],
      order: [['startTime', 'ASC']],
      offset: (page - 1) * limit,
      limit: parseInt(limit),
      distinct: true
    };

    // Apply filters
    if (eventType) {
      query.where.eventType = eventType;
    }

    if (searchTerm) {
      query.where[Op.or] = [
        { title: { [Op.like]: `%${searchTerm}%` } },
        { description: { [Op.like]: `%${searchTerm}%` } }
      ];
    }

    if (startDate) {
      query.where.startTime = { [Op.gte]: new Date(startDate) };
    }

    if (endDate) {
      query.where.endTime = { [Op.lte]: new Date(endDate) };
    }

    if (isOnline !== undefined) {
      query.where.isOnline = isOnline === 'true';
    }

    if (location) {
      query.where[Op.or] = [
        { city: { [Op.like]: `%${location}%` } },
        { state: { [Op.like]: `%${location}%` } },
        { country: { [Op.like]: `%${location}%` } }
      ];
    }

    if (tags) {
      // Handle array of tags or single tag
      const tagArray = Array.isArray(tags) ? tags : [tags];
      query.where.tags = { [Op.contains]: tagArray };
    }

    // Get count for pagination
    const count = await Event.count({ where: query.where });

    // Get events
    const events = await Event.findAll(query);

    // Add RSVP count and format data
    const formattedEvents = events.map(event => {
      const eventJson = event.toJSON();
      eventJson.rsvpCount = eventJson.rsvps.length;
      return eventJson;
    });

    res.status(200).json({
      status: 'success',
      results: formattedEvents.length,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      data: {
        events: formattedEvents
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching events'
    });
  }
};

// Get single event by ID
exports.getEvent = async (req, res) => {
  try {
    const event = await Event.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'host',
          attributes: ['id', 'name', 'email', 'profileImage', 'bio']
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
        },
        {
          model: Comment,
          as: 'comments',
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

    // Format the event data
    const formattedEvent = event.toJSON();
    formattedEvent.rsvpCount = formattedEvent.rsvps.length;
    formattedEvent.goingCount = formattedEvent.rsvps.filter(rsvp => rsvp.status === 'going').length;
    formattedEvent.interestedCount = formattedEvent.rsvps.filter(rsvp => rsvp.status === 'interested').length;

    res.status(200).json({
      status: 'success',
      data: {
        event: formattedEvent
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching event'
    });
  }
};

// Create new event
exports.createEvent = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'fail',
        errors: errors.array()
      });
    }

    // Set the host ID from the authenticated user
    req.body.hostId = req.user.id;

    // Create the event
    const newEvent = await Event.create(req.body);

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
      message: 'Error creating event'
    });
  }
};

// Update event
exports.updateEvent = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'fail',
        errors: errors.array()
      });
    }

    // Find the event
    const event = await Event.findByPk(req.params.id);

    if (!event) {
      return res.status(404).json({
        status: 'fail',
        message: 'Event not found'
      });
    }

    // Check if user is the host
    if (event.hostId !== req.user.id) {
      return res.status(403).json({
        status: 'fail',
        message: 'You are not authorized to update this event'
      });
    }

    // Update the event
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
      message: 'Error updating event'
    });
  }
};

// Delete event
exports.deleteEvent = async (req, res) => {
  try {
    // Find the event
    const event = await Event.findByPk(req.params.id);

    if (!event) {
      return res.status(404).json({
        status: 'fail',
        message: 'Event not found'
      });
    }

    // Check if user is the host
    if (event.hostId !== req.user.id) {
      return res.status(403).json({
        status: 'fail',
        message: 'You are not authorized to delete this event'
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
      message: 'Error deleting event'
    });
  }
};

// RSVP to an event
exports.rsvpToEvent = async (req, res) => {
  try {
    const { status } = req.body;
    const { id } = req.params;
    const userId = req.user.id;

    // Check if event exists
    const event = await Event.findByPk(id);
    if (!event) {
      return res.status(404).json({
        status: 'fail',
        message: 'Event not found'
      });
    }

    // Check if the user is already RSVP'd
    let rsvp = await RSVP.findOne({
      where: { userId, eventId: id }
    });

    if (rsvp) {
      // Update existing RSVP
      rsvp = await rsvp.update({ status });
    } else {
      // Create new RSVP
      rsvp = await RSVP.create({
        userId,
        eventId: id,
        status
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        rsvp
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: 'error',
      message: 'Error processing RSVP'
    });
  }
};

// Get events by host
exports.getEventsByHost = async (req, res) => {
  try {
    const { hostId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const events = await Event.findAndCountAll({
      where: { hostId, active: true },
      include: [
        {
          model: User,
          as: 'host',
          attributes: ['id', 'name', 'profileImage']
        }
      ],
      order: [['startTime', 'ASC']],
      offset: (page - 1) * limit,
      limit: parseInt(limit),
      distinct: true
    });

    res.status(200).json({
      status: 'success',
      results: events.rows.length,
      totalPages: Math.ceil(events.count / limit),
      currentPage: parseInt(page),
      data: {
        events: events.rows
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching host events'
    });
  }
};

// Get events user is attending
exports.getMyEvents = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10, status } = req.query;

    const where = { userId };
    if (status) {
      where.status = status;
    }

    const rsvps = await RSVP.findAndCountAll({
      where,
      include: [
        {
          model: Event,
          as: 'event',
          where: { active: true },
          include: [
            {
              model: User,
              as: 'host',
              attributes: ['id', 'name', 'profileImage']
            }
          ]
        }
      ],
      order: [[{ model: Event, as: 'event' }, 'startTime', 'ASC']],
      offset: (page - 1) * limit,
      limit: parseInt(limit),
      distinct: true
    });

    // Format the events
    const events = rsvps.rows.map(rsvp => {
      const event = rsvp.event.toJSON();
      event.rsvpStatus = rsvp.status;
      return event;
    });

    res.status(200).json({
      status: 'success',
      results: events.length,
      totalPages: Math.ceil(rsvps.count / limit),
      currentPage: parseInt(page),
      data: {
        events
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching your events'
    });
  }
};

// Submit event feedback
exports.submitEventFeedback = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { rating, feedback } = req.body;

    // Find the RSVP
    const rsvp = await RSVP.findOne({
      where: { 
        userId, 
        eventId: id,
        status: 'going' 
      }
    });

    if (!rsvp) {
      return res.status(404).json({
        status: 'fail',
        message: 'You must RSVP and attend the event to provide feedback'
      });
    }

    // Update RSVP with feedback
    await rsvp.update({
      rating,
      feedback,
      feedbackSubmittedAt: new Date()
    });

    res.status(200).json({
      status: 'success',
      data: {
        rsvp
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: 'error',
      message: 'Error submitting feedback'
    });
  }
};

// Get upcoming events by category
exports.getEventsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const events = await Event.findAndCountAll({
      where: { 
        eventType: category,
        active: true,
        startTime: { [Op.gte]: new Date() }
      },
      include: [
        {
          model: User,
          as: 'host',
          attributes: ['id', 'name', 'profileImage']
        }
      ],
      order: [['startTime', 'ASC']],
      offset: (page - 1) * limit,
      limit: parseInt(limit),
      distinct: true
    });

    res.status(200).json({
      status: 'success',
      results: events.rows.length,
      totalPages: Math.ceil(events.count / limit),
      currentPage: parseInt(page),
      data: {
        events: events.rows
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching category events'
    });
  }
};

// Check in to an event
exports.checkInToEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Find the RSVP
    const rsvp = await RSVP.findOne({
      where: { 
        userId, 
        eventId: id,
        status: 'going' 
      }
    });

    if (!rsvp) {
      return res.status(404).json({
        status: 'fail',
        message: 'You must RSVP as going to check in to this event'
      });
    }

    // Update RSVP with check-in
    await rsvp.update({
      checkedIn: true
    });

    res.status(200).json({
      status: 'success',
      data: {
        rsvp
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: 'error',
      message: 'Error checking in to event'
    });
  }
};

// Get RSVP list for an event
exports.getEventRSVPs = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.query;

    const where = { eventId: id };
    if (status) {
      where.status = status;
    }

    // Find all RSVPs for the event
    const rsvps = await RSVP.findAll({
      where,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'profileImage']
        }
      ]
    });

    res.status(200).json({
      status: 'success',
      results: rsvps.length,
      data: {
        rsvps
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching event RSVPs'
    });
  }
};