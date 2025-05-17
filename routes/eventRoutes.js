// routes/eventRoutes.js
const express = require('express');
const eventController = require('../controllers/eventController');
const authController = require('../controllers/authController');
const { Op } = require('sequelize');

const router = express.Router();

// Public routes
router.get('/', eventController.getAllEvents);
router.get('/types/stats', eventController.getEventTypeStats);
router.get('/:id', eventController.getEvent);

// Protected routes
router.use(authController.protect);

router.post('/', eventController.createEvent);
router.patch('/:id', eventController.updateEvent);
router.delete('/:id', eventController.deleteEvent);

// RSVP routes
router.post('/:id/rsvp', eventController.createRSVP);
router.get('/:id/attendees', eventController.getEventAttendees);

// Comment routes
router.post('/:id/comments', eventController.createComment);
router.get('/:id/comments', eventController.getEventComments);

module.exports = router;