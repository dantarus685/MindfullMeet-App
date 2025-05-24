// routes/supportRoutes.js
const express = require('express');
const supportController = require('../controllers/supportController');
const authController = require('../controllers/authController');

const router = express.Router();

// Protect all routes - user must be authenticated
router.use(authController.protect);

// Room management routes
router.post('/rooms', supportController.createSupportRoom);
router.get('/rooms', supportController.getUserRooms);

// Room-specific routes
router.get('/rooms/:id', supportController.joinRoom);
router.get('/rooms/:id/messages', supportController.getRoomMessages);
router.post('/rooms/:id/messages', supportController.sendMessage);

module.exports = router;