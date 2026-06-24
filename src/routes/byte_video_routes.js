const express = require('express');
const router = express.Router();
const byteVideoController = require('../controllers/byte_video_controller');
const { authenticate, authorize } = require('../middleware/auth_middleware');

// Byte Video — AI short-video generation. Instructor (2) + Super Admin (4).
router.use(authenticate, authorize(2, 4));

router.post('/', byteVideoController.createByteVideo);
router.get('/', byteVideoController.listByteVideos);
router.get('/:id', byteVideoController.getByteVideo);
router.delete('/:id', byteVideoController.deleteByteVideo);
// Create a new Content-Based lesson from a completed byte video.
router.post('/:id/create-lesson', byteVideoController.createLessonFromByteVideo);

module.exports = router;
