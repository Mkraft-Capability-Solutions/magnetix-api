const express = require('express');
const router = express.Router();
const controller = require('../../controllers/manager/reportees_controller');
const { authenticate } = require('../../middleware/auth_middleware');
const { requireAnyManagerRole } = require('../../middleware/manager_middleware');

router.use(authenticate);
router.use(requireAnyManagerRole);

router.get('/', controller.listReportees);
router.get('/submissions', controller.listReporteeSubmissions);
router.get('/:userId', controller.getReportee);

module.exports = router;
