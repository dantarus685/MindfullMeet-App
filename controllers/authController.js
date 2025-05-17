// controllers/authController.js
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { User } = require('../models');
const { validationResult } = require('express-validator');

// Generate JWT Token
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '90d'
  });
};

// Register a new user
exports.signup = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        status: 'fail',
        errors: errors.array() 
      });
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ where: { email: req.body.email } });
    if (existingUser) {
      return res.status(400).json({
        status: 'fail',
        message: 'Email already in use'
      });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(req.body.password, 12);
    
    // Create user
    const newUser = await User.create({
      name: req.body.name,
      email: req.body.email,
      password: hashedPassword,
      bio: req.body.bio || '',
      interests: req.body.interests || [],
      wellnessGoals: req.body.wellnessGoals || []
    });
    
    // Generate token
    const token = generateToken(newUser.id);
    
    // Remove password from response
    const userWithoutPassword = await User.findByPk(newUser.id);
    
    // Send response
    res.status(201).json({
      status: 'success',
      token,
      data: {
        user: userWithoutPassword
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: 'error',
      message: 'Server error during registration'
    });
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        status: 'fail',
        errors: errors.array() 
      });
    }
    
    const { email, password } = req.body;
    
    // Find user
    const user = await User.scope('withPassword').findOne({ where: { email } });
    
    // Check if user exists and password is correct
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({
        status: 'fail',
        message: 'Incorrect email or password'
      });
    }
    
    // Generate token
    const token = generateToken(user.id);
    
    // Remove password from response
    const userWithoutPassword = await User.findByPk(user.id);
    
    // Send response
    res.status(200).json({
      status: 'success',
      token,
      data: {
        user: userWithoutPassword
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: 'error',
      message: 'Server error during login'
    });
  }
};

// Protect routes middleware
exports.protect = async (req, res, next) => {
  try {
    // 1) Get token
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    
    if (!token) {
      return res.status(401).json({
        status: 'fail',
        message: 'You are not logged in. Please log in to get access.'
      });
    }
    
    // 2) Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // 3) Check if user still exists
    const currentUser = await User.findByPk(decoded.id);
    if (!currentUser) {
      return res.status(401).json({
        status: 'fail',
        message: 'The user belonging to this token no longer exists.'
      });
    }
    
    // 4) Check if user changed password after token was issued
    if (currentUser.passwordChangedAt) {
      const changedTimestamp = parseInt(
        currentUser.passwordChangedAt.getTime() / 1000,
        10
      );
      
      if (decoded.iat < changedTimestamp) {
        return res.status(401).json({
          status: 'fail',
          message: 'User recently changed password. Please log in again.'
        });
      }
    }
    
    // Grant access to protected route
    req.user = currentUser;
    next();
  } catch (err) {
    return res.status(401).json({
      status: 'fail',
      message: 'Invalid token or authorization error'
    });
  }
};

// Restrict to certain roles
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have permission to perform this action'
      });
    }
    next();
  };
};