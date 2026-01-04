const express = require('express');
const router = express.Router();
const corporateInfoController = require('../../controllers/student/corporate_info_controller');
const { authenticate, authorize } = require('../../middleware/auth_middleware');

// All routes require authentication and student role (role_id = 1)

/**
 * @route   GET /api/student/corporate-info
 * @desc    Get own corporate information
 * @access  Private (Student only)
 */
router.get(
  '/',
  authenticate,
  authorize(1), // Only students (role_id = 1)
  corporateInfoController.getCorporateInfo
);

/**
 * @route   PUT /api/student/corporate-info
 * @desc    Create or update own corporate information
 * @access  Private (Student only)
 */
router.put(
  '/',
  authenticate,
  authorize(1), // Only students (role_id = 1)
  corporateInfoController.updateCorporateInfo
);

/**
 * @route   DELETE /api/student/corporate-info
 * @desc    Delete own corporate information
 * @access  Private (Student only)
 */
router.delete(
  '/',
  authenticate,
  authorize(1), // Only students (role_id = 1)
  corporateInfoController.deleteCorporateInfo
);

module.exports = router;
