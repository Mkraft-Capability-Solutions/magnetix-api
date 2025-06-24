// routes/landing_routes.js
const express = require('express');
const router = express.Router();
const landingController = require('../controllers/landing_controller');

// Get all landing page sections
router.get('/', landingController.getAllSections);

// Get specific section by type
router.get('/:sectionType', landingController.getSectionByType);

module.exports = router;