// routes/userRoutes.js
const express = require('express');
const userController = require('../controllers/userController');
const authController = require('../controllers/authController');
const { uploadProfileImage, testUpload } = require('../utils/imageUpload');

const router = express.Router();

// Test upload endpoint (public route for testing)
// router.get('/upload-test', testUpload);

// Protect all routes after this middleware
router.use(authController.protect);

// Profile routes
router.get('/profile', userController.getProfile);
router.patch('/profile', userController.updateProfile);

// Image upload route - uses the utility function
router.post('/upload-profile-image', 
  uploadProfileImage, 
  userController.handleProfileImageUpload
);

// User search and listing
router.get('/search', userController.searchUsers);
router.get('/', userController.getAllUsers);

// User events
router.get('/events', userController.getUserEvents);

module.exports = router;