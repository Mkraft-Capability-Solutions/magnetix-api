const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/auth_middleware');
const teamController = require('../../controllers/student/team_controller');

router.use(authenticate);

router.get('/my-teams', teamController.getMyTeams);

module.exports = router;
