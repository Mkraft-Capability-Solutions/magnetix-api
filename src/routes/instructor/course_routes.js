const express = require('express');
const router = express.Router();
const instructorCourseController = require('../../controllers/instructor/course_controller');
const { authenticate, authorize } = require('../../middleware/auth_middleware');

router.use(authenticate);
router.use(authorize(2)); 

// Course CRUD operations
router.post('/courses', instructorCourseController.addCourse);
router.put('/courses/:courseId', instructorCourseController.updateCourse);
router.delete('/courses/:courseId', instructorCourseController.deleteCourse);

// Get courses
router.get('/courses/active', instructorCourseController.getActiveCourses);
router.get('/courses/pending', instructorCourseController.getPendingCourses);

// Get metadata
router.get('/metadata/categories', instructorCourseController.getCategories);
router.get('/metadata/subcategories', instructorCourseController.getSubCategories);
router.get('/metadata/languages', instructorCourseController.getLanguages);

// Get enrolled students
router.get('/courses/:courseId/students', instructorCourseController.getEnrolledStudents);

module.exports = router;