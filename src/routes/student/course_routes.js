const express = require('express');
const router = express.Router();
const courseController = require('../../controllers/student/course_controller');
const { authenticate, authorize } = require('../../middleware/auth_middleware');

// All routes require authentication and student role
router.use(authenticate);
router.use(authorize(1));

// Course routes
router.get('/subscribed', courseController.getSubscribedCourses);
router.get('/explore', courseController.exploreCourses);
router.post('/enroll', courseController.enrollInCourse);

module.exports = router;