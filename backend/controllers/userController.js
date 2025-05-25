// controllers/userController.js
const { User, Event, RSVP } = require('../models');
const { Op } = require('sequelize');

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

// Search users
exports.searchUsers = async (req, res) => {
  try {
    const { search = '', limit = 20, page = 1 } = req.query;
    const offset = (page - 1) * limit;
    const currentUserId = req.user.id;

    // Build search conditions
    const whereConditions = {
      active: true,
      id: { [Op.ne]: currentUserId } // Exclude current user
    };

    if (search.trim().length > 0) {
      whereConditions[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } }
      ];
    }

    const users = await User.findAndCountAll({
      where: whereConditions,
      attributes: ['id', 'name', 'email', 'profileImage', 'role', 'createdAt'],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['name', 'ASC']]
    });

    res.status(200).json({
      status: 'success',
      data: {
        users: users.rows,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(users.count / limit),
          totalUsers: users.count,
          hasNext: offset + parseInt(limit) < users.count,
          hasPrev: page > 1
        }
      }
    });
  } catch (err) {
    console.error('Search users error:', err);
    res.status(500).json({
      status: 'error',
      message: 'Server error while searching users'
    });
  }
};

// Get all users (for admin or general listing)
exports.getAllUsers = async (req, res) => {
  try {
    const { limit = 20, page = 1 } = req.query;
    const offset = (page - 1) * limit;
    const currentUserId = req.user.id;

    const users = await User.findAndCountAll({
      where: {
        active: true,
        id: { [Op.ne]: currentUserId } // Exclude current user
      },
      attributes: ['id', 'name', 'email', 'profileImage', 'role', 'createdAt'],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['name', 'ASC']]
    });

    res.status(200).json({
      status: 'success',
      data: {
        users: users.rows,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(users.count / limit),
          totalUsers: users.count,
          hasNext: offset + parseInt(limit) < users.count,
          hasPrev: page > 1
        }
      }
    });
  } catch (err) {
    console.error('Get all users error:', err);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching users'
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