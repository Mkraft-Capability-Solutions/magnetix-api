const express = require('express');
const router = express.Router();
const userController = require('../controllers/user_controller');
const { authenticate, authorize } = require('../middleware/auth_middleware');
const { validateUserAccess, validateUpdatePermissions } = require('../middleware/access_middleware');

// Get user details
router.post('/get-user', userController.getUser);

// List users with pagination
router.post('/list-users',
  authenticate,
  authorize(4), // Only admins can list users
  userController.listUsers
);

// Update user
router.post('/update-user',
  authenticate,
  validateUserAccess,
  validateUpdatePermissions,
  userController.updateUser
);

// Delete user
router.post('/delete-user',
  authenticate,
  authorize(3, 4), // Only admins can delete
  userController.deleteUser
);

module.exports = router;