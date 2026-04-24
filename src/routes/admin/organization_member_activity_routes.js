const express = require('express');
const router = express.Router();
const controller = require('../../controllers/admin/organization_member_activity_controller');
const { authenticate, authorize } = require('../../middleware/auth_middleware');
const { verifyOrgMembership } = require('../../middleware/org_membership_middleware');

router.use(authenticate);
router.use(authorize(3, 4)); // Admin, Super Admin
router.use('/:userId', verifyOrgMembership);

router.get('/:userId/overview',                controller.getOverview);
router.get('/:userId/enrolled-courses',        controller.getEnrolledCourses);
router.get('/:userId/assessments',             controller.getAssessments);
router.get('/:userId/certificates',            controller.getCertificates);
router.get('/:userId/learning-hours',          controller.getLearningHours);
router.get('/:userId/enrollable-courses',      controller.getEnrollableCourses);
router.get('/:userId/assignable-assessments',  controller.getAssignableAssessments);

router.post('/:userId/enroll',             controller.enrollInCourse);
router.post('/:userId/assign-assessment',  controller.assignAssessment);

module.exports = router;
