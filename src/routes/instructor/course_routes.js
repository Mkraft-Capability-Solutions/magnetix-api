const express = require('express');
const router = express.Router();
const courseController = require('../../controllers/instructor/course_controller');
const { authenticate, authorize } = require('../../middleware/auth_middleware');

// Instructor-only routes
router.use(authenticate);
router.use(authorize(2)); // Only instructors can access these routes

// Course management routes
router.post('/', courseController.addCourse);
router.put('/:courseId', courseController.updateCourse);
router.delete('/:courseId', courseController.deleteCourse);

// Get instructor's courses
router.get('/active', courseController.getMyActiveCourses);
router.get('/pending', courseController.getMyPendingCourses);

// Get metadata
router.get('/categories', courseController.getCategories);
router.get('/subcategories', courseController.getSubCategories);
router.get('/languages', courseController.getLanguages);

// Get enrolled students
router.get('/:courseId/students', courseController.getAllEnrolledStudents);

module.exports = router;