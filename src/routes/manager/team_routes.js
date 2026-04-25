const express = require('express');
const router = express.Router();
const controller = require('../../controllers/manager/team_controller');
const { authenticate } = require('../../middleware/auth_middleware');
const { requireAnyManagerRole, requireManagerOfTeam } = require('../../middleware/manager_middleware');

router.use(authenticate);
router.use(requireAnyManagerRole);

router.get('/', controller.listMyTeams);
router.get('/:teamId/members', requireManagerOfTeam, controller.getTeamMembers);
router.get('/:teamId/learning-history', requireManagerOfTeam, controller.getTeamLearningHistory);

module.exports = router;
