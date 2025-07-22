const express = require('express');
const router = express.Router();
const controller = require('../controllers/notification_permission_controller');

const { authenticate, authorize } = require('../middleware/auth_middleware');

router.post('/add', authenticate, authorize(1, 2, 3, 4), controller.addPermission);
router.post('/remove', authenticate, authorize(1, 2, 3, 4), controller.removePermission);
router.get('/user/:user_id', authenticate, authorize(1, 2, 3, 4), controller.getUserPermissions);
router.get('/all', authenticate, authorize(1, 2, 3, 4), controller.getAllPermissions);

module.exports = router;
