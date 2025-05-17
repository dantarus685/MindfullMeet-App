// controllers/supportController.js
const { SupportRoom, SupportMessage, User } = require('../models');

// Create support room
exports.createSupportRoom = async (req, res) => {
  try {
    // Simple implementation - will expand later
    res.status(200).json({
      status: 'success',
      message: 'Create support room endpoint'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
};

// Get user's support rooms
exports.getUserRooms = async (req, res) => {
  try {
    // Simple implementation - will expand later
    res.status(200).json({
      status: 'success',
      message: 'Get user rooms endpoint'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
};

// Get room messages
exports.getRoomMessages = async (req, res) => {
  try {
    // Simple implementation - will expand later
    res.status(200).json({
      status: 'success',
      message: 'Get room messages endpoint'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
};