const express = require('express');
const router = express.Router();
const corporateInfoController = require('../../controllers/student/corporate_info_controller');
const { authenticate, authorize } = require('../../middleware/auth_middleware');

// All routes require authentication (Students, Trainers, Admins)

/**
 * @route   GET /api/student/corporate-info
 * @desc    Get own corporate information
 * @access  Private (Students, Trainers, Admins)
 */
router.get(
  '/',
  authenticate,
  authorize(1, 2, 3), // Students, Trainers, Admins
  corporateInfoController.getCorporateInfo
);

/**
 * @route   PUT /api/student/corporate-info
 * @desc    Create or update own corporate information
 * @access  Private (Students, Trainers, Admins)
 */
router.put(
  '/',
  authenticate,
  authorize(1, 2, 3), // Students, Trainers, Admins
  corporateInfoController.updateCorporateInfo
);

/**
 * @route   DELETE /api/student/corporate-info
 * @desc    Delete own corporate information
 * @access  Private (Students, Trainers, Admins)
 */
router.delete(
  '/',
  authenticate,
  authorize(1, 2, 3), // Students, Trainers, Admins
  corporateInfoController.deleteCorporateInfo
);

module.exports = router;
