// routes/eventRoutes.js
const express = require('express');
const { body } = require('express-validator');
const eventController = require('../controllers/eventController');
const authController = require('../controllers/authController');

const router = express.Router();

// Public routes - Fix the order: specific routes first, then parameterized routes
router.get('/category/:category', eventController.getEventsByCategory); // More specific route first
router.get('/host/:hostId', eventController.getEventsByHost); // More specific route first
router.get('/my/events', eventController.getMyEvents); // More specific route first
router.get('/', eventController.getAllEvents); // Root route
router.get('/:id', eventController.getEvent); // Generic ID route last

// Protected routes
router.use(authController.protect); // Middleware to protect routes below

router.post('/', [
  body('title').notEmpty().withMessage('Title is required'),
  body('description').notEmpty().withMessage('Description is required'),
  body('eventType').notEmpty().withMessage('Event type is required'),
  body('startTime').notEmpty().withMessage('Start time is required'),
  body('endTime').notEmpty().withMessage('End time is required')
], eventController.createEvent);

// RSVP routes
router.post('/:id/rsvp', [
  body('status').isIn(['going', 'interested', 'not-going']).withMessage('Invalid RSVP status')
], eventController.rsvpToEvent);

router.post('/:id/checkin', eventController.checkInToEvent);
router.get('/:id/rsvps', eventController.getEventRSVPs);

router.post('/:id/feedback', [
  body('rating').isInt({min: 1, max: 5}).withMessage('Rating must be between 1 and 5'),
  body('feedback').notEmpty().withMessage('Feedback is required')
], eventController.submitEventFeedback);

router.patch('/:id', eventController.updateEvent);
router.delete('/:id', eventController.deleteEvent);

module.exports = router;