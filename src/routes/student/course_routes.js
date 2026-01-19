const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../middleware/auth_middleware');
const courseController = require('../../controllers/student/course_controller');

router.get('/subscribed', authenticate, authorize(1), courseController.getSubscribedCourses);
router.get('/explore', authenticate, authorize(1), courseController.exploreCourses);
router.get('/:courseId/reviews', authenticate, authorize(1), courseController.getCourseReviews);
router.get('/:courseId/rating', authenticate, authorize(1), courseController.getCourseRating);
router.get('/instructor/:instructorId/rating', authenticate, authorize(1), courseController.getInstructorRating);
router.get('/recommendations', authenticate, authorize(1), courseController.getRecommendedCourses);
router.post('/enroll', authenticate, authorize(1), courseController.enrollInCourse);
router.get('/:courseId/progress', authenticate, authorize(1), courseController.getCourseProgress);
router.get('/last-accessed', authenticate, authorize(1), courseController.getLastAccessedCourse);
router.post('/save', authenticate, authorize(1), courseController.saveCourse);
router.post('/unsave', authenticate, authorize(1), courseController.unsaveCourse);
router.get('/saved', authenticate, authorize(1), courseController.getSavedCourses);
router.get('/:courseId/is-saved', authenticate, authorize(1), courseController.isCourseSaved);

router.get('/:courseId/skills', authenticate, authorize(1), courseController.getCourseSkills);
router.get('/skills/achieved/total', authenticate, authorize(1), courseController.getTotalAchievedSkills);
router.get('/:courseId/skills/gained', authenticate, authorize(1), courseController.getGainedSkillsByCourse);
router.get('/:courseId/skills/remaining', authenticate, authorize(1), courseController.getRemainingSkillsByCourse);


router.get('/:courseId', authenticate, authorize(1), courseController.getCourseDetails);

// Get single lesson details
router.get('/:courseId/lessons/:lessonId', authenticate, authorize(1), courseController.getLessonById);

// Mark lesson complete - supports both URL params and body params for backward compatibility
router.post('/:courseId/lessons/:lessonId/complete', authenticate, authorize(1), courseController.markLessonCompleted);
router.post('/mark-lesson-completed', authenticate, authorize(1), courseController.markLessonCompleted);

module.exports = router;