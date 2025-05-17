// routes/supportRoutes.js
const express = require('express');
const supportController = require('../controllers/supportController');
const authController = require('../controllers/authController');

const router = express.Router();

// Protect all routes
router.use(authController.protect);

router.post('/rooms', supportController.createSupportRoom);
router.get('/rooms', supportController.getUserRooms);
router.get('/rooms/:id/messages', supportController.getRoomMessages);

module.exports = router;