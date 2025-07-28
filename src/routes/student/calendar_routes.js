// routes/student/calendar_routes.js
const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/auth_middleware');
const calendarController = require('../../controllers/student/calendar_controller');

router.get('/', authenticate, calendarController.getCalendarData);

module.exports = router;