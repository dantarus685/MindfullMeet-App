// routes/userRoutes.js
const express = require('express');
const userController = require('../controllers/userController');
const authController = require('../controllers/authController');

const router = express.Router();

// Protect all routes
router.use(authController.protect);

// User search and listing routes
router.get('/', userController.searchUsers); // This handles /api/users?search=...
router.get('/all', userController.getAllUsers);

// User profile routes
router.get('/profile', userController.getProfile);
router.patch('/profile', userController.updateProfile);

// User events
router.get('/events', userController.getUserEvents);

module.exports = router;