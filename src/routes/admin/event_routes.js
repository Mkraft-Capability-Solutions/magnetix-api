const express = require('express');
const router = express.Router();
const multer = require('multer');
const adminEventController = require('../../controllers/admin/event_controller');
const { authenticate, authorize } = require('../../middleware/auth_middleware');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit for event thumbnails
  }
});

const attendanceUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit for attendance files
  }
});

// Apply middleware to all routes
router.use(authenticate);
router.use(authorize(3, 4)); // Admin (3) and Super Admin (4) only

// Event routes - specific routes must come before parameterized routes
router.post('/', upload.single('eventThumbnail'), adminEventController.createEvent);
router.get('/all/upcoming', adminEventController.getAllUpcomingEvents);
router.get('/all/past', adminEventController.getAllPastEvents);
router.get('/my/upcoming', adminEventController.getMyUpcomingEvents);
router.get('/my/past', adminEventController.getMyPastEvents);
router.put('/', upload.single('eventThumbnail'), adminEventController.updateEvent);
router.delete('/', adminEventController.deleteEvent);
router.get('/:eventId', adminEventController.getEventById);
router.get('/:eventId/attendees', adminEventController.getEventAttendees);
router.post('/:eventId/bulk-enroll', adminEventController.bulkEnrollStudents);

// Attendance file routes
router.post('/:eventId/attendance/upload', attendanceUpload.single('attendanceFile'), adminEventController.uploadAttendanceFile);
router.get('/:eventId/attendance/download', adminEventController.downloadAttendanceFile);
router.delete('/:eventId/attendance', adminEventController.removeAttendanceFile);

module.exports = router;