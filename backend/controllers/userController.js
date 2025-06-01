// controllers/userController.js - Updated version with image upload utility
const { User, Event, RSVP } = require('../models');
const { Op } = require('sequelize');
const { deleteOldImage } = require('../utils/imageUpload');

// Get user profile
exports.getProfile = async (req, res) => {
  try {
    console.log('🔄 Getting profile for user:', req.user.id);
    
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password', 'passwordResetToken', 'passwordResetExpires'] }
    });
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    console.log('✅ Profile fetched for user:', user.email);
    
    res.status(200).json({
      status: 'success',
      data: {
        user
      }
    });
  } catch (err) {
    console.error('❌ Get profile error:', err);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching profile'
    });
  }
};

// Handle profile image upload
exports.handleProfileImageUpload = async (req, res) => {
  try {
    console.log('🔄 Processing profile image upload for user:', req.user.id);
    
    const user = await User.findByPk(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Get the uploaded image URL from the middleware
    const imageUrl = req.uploadedImageUrl;
    
    if (!imageUrl) {
      return res.status(400).json({
        status: 'error',
        message: 'Image upload failed'
      });
    }

    // Delete old profile image
    if (user.profileImage) {
      const storageType = process.env.UPLOAD_STORAGE_TYPE || 'local';
      await deleteOldImage(user.profileImage, storageType);
    }

    // Update user with new profile image
    await user.update({ profileImage: imageUrl });

    console.log('✅ Profile image updated successfully:', imageUrl);

    // Return updated user data
    const updatedUser = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password', 'passwordResetToken', 'passwordResetExpires'] }
    });

    res.status(200).json({
      status: 'success',
      data: {
        imageUrl,
        user: updatedUser
      }
    });
  } catch (error) {
    console.error('❌ Profile image upload error:', error);
    
    res.status(500).json({
      status: 'error',
      message: 'Server error while uploading image'
    });
  }
};

// Update user profile
exports.updateProfile = async (req, res) => {
  try {
    console.log('🔄 Updating profile for user:', req.user.id);
    console.log('📝 Update data:', req.body);
    
    const user = await User.findByPk(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Validate and process the update data
    const allowedFields = [
      'name', 'email', 'bio', 'profileImage', 
      'interests', 'wellnessGoals', 'phoneNumber', 
      'location', 'website', 'skills'
    ];

    const updateData = {};
    
    // Only include allowed fields
    Object.keys(req.body).forEach(key => {
      if (allowedFields.includes(key) && req.body[key] !== undefined) {
        updateData[key] = req.body[key];
      }
    });

    // Handle interests array
    if (updateData.interests && Array.isArray(updateData.interests)) {
      updateData.interests = updateData.interests.filter(interest => interest.trim() !== '');
    }

    // Handle skills - store in wellnessGoals.skills
    if (updateData.skills && Array.isArray(updateData.skills)) {
      const filteredSkills = updateData.skills.filter(skill => skill.trim() !== '');
      
      // Get existing wellnessGoals or create new object
      const existingGoals = user.wellnessGoals || {};
      updateData.wellnessGoals = {
        ...existingGoals,
        skills: filteredSkills
      };
      
      delete updateData.skills; // Remove skills from main update
    }

    // Validate email format if email is being updated
    if (updateData.email && updateData.email !== user.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(updateData.email)) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid email format'
        });
      }
    }

    console.log('🔧 Processed update data:', updateData);

    // Update the user
    await user.update(updateData);

    // Fetch updated user (excluding sensitive fields)
    const updatedUser = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password', 'passwordResetToken', 'passwordResetExpires'] }
    });

    console.log('✅ Profile updated successfully for user:', updatedUser.email);
    
    res.status(200).json({
      status: 'success',
      data: {
        user: updatedUser
      }
    });
  } catch (err) {
    console.error('❌ Update profile error:', err);
    
    // Handle specific database errors
    if (err.name === 'SequelizeValidationError') {
      return res.status(400).json({
        status: 'error',
        message: 'Validation error',
        errors: err.errors.map(e => ({ field: e.path, message: e.message }))
      });
    }
    
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        status: 'error',
        message: 'Email already exists'
      });
    }
    
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

    console.log('🔍 Searching users:', { search, limit, page, currentUserId });

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
      attributes: ['id', 'name', 'email', 'profileImage', 'role', 'bio', 'createdAt'],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['name', 'ASC']]
    });

    console.log('✅ Users search completed:', users.count, 'users found');

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
    console.error('❌ Search users error:', err);
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

    console.log('🔄 Getting all users:', { limit, page, currentUserId });

    const users = await User.findAndCountAll({
      where: {
        active: true,
        id: { [Op.ne]: currentUserId } // Exclude current user
      },
      attributes: ['id', 'name', 'email', 'profileImage', 'role', 'bio', 'createdAt'],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['name', 'ASC']]
    });

    console.log('✅ All users fetched:', users.count, 'users found');

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
    console.error('❌ Get all users error:', err);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching users'
    });
  }
};

// Get user's events
exports.getUserEvents = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('🔄 Getting events for user:', userId);

    // Get events where user is host
    const hostedEvents = await Event.findAll({
      where: { hostId: userId },
      include: [
        {
          model: User,
          as: 'host',
          attributes: ['id', 'name', 'email', 'profileImage']
        }
      ],
      order: [['startTime', 'DESC']]
    });

    // Get events where user has RSVP'd
    const attendedEvents = await Event.findAll({
      include: [
        {
          model: RSVP,
          as: 'rsvps',
          where: { userId },
          attributes: ['status', 'createdAt']
        },
        {
          model: User,
          as: 'host',
          attributes: ['id', 'name', 'email', 'profileImage']
        }
      ],
      order: [['startTime', 'DESC']]
    });

    console.log('✅ User events fetched:', {
      hosted: hostedEvents.length,
      attended: attendedEvents.length
    });

    res.status(200).json({
      status: 'success',
      data: {
        hostedEvents,
        attendedEvents,
        totalEvents: hostedEvents.length + attendedEvents.length
      }
    });
  } catch (err) {
    console.error('❌ Get user events error:', err);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching user events'
    });
  }
};