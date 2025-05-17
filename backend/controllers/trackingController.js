// controllers/trackingController.js
const { WellnessTracking } = require('../models');

// Create wellness tracking entry
exports.createTracking = async (req, res) => {
  try {
    // Simple implementation - will expand later
    res.status(200).json({
      status: 'success',
      message: 'Create tracking endpoint'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
};

// Get wellness tracking history
exports.getTrackingHistory = async (req, res) => {
  try {
    // Simple implementation - will expand later
    res.status(200).json({
      status: 'success',
      message: 'Get tracking history endpoint'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
};