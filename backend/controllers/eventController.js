// controllers/rsvpController.js
const { RSVP, Event, User } = require('../models');

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