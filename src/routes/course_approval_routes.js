const express = require('express');
const router = express.Router();
const controller = require('../controllers/super_admin/course_approval_controller');
const { authenticate, authorize } = require('../middleware/auth_middleware');

// Approval inbox is open to any non-learner (instructor=2, admin=3, super-admin=4).
router.use(authenticate);
router.use(authorize(2, 3, 4));

// GET  /api/course-approvals/mine        — my pending approval requests
router.get('/mine', controller.listMine);

// POST /api/course-approvals/:id/decide  — approve/reject (designated approver only)
router.post('/:id/decide', controller.decide);

module.exports = router;
