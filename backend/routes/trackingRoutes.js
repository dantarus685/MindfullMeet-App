// routes/trackingRoutes.js
const express = require('express');
const trackingController = require('../controllers/trackingController');
const authController = require('../controllers/authController');

const router = express.Router();

// Protect all routes
router.use(authController.protect);

router.post('/', trackingController.createTracking);
router.get('/history', trackingController.getTrackingHistory);

module.exports = router;