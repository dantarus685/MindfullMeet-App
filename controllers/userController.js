// controllers/userController.js
const { User, Event, RSVP } = require('../models');

// Get user profile
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    
    res.status(200).json({
      status: 'success',
      data: {
        user
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching profile'
    });
  }
};

// Update user profile
exports.updateProfile = async (req, res) => {
  try {
    // Simple implementation - will expand later
    const user = await User.findByPk(req.user.id);
    await user.update(req.body);
    
    res.status(200).json({
      status: 'success',
      data: {
        user
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: 'error',
      message: 'Server error while updating profile'
    });
  }
};

// Get user's events
exports.getUserEvents = async (req, res) => {
  try {
    // Simple implementation - will expand later
    res.status(200).json({
      status: 'success',
      message: 'Get user events endpoint'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
};