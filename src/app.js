const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');

const app = express();

// CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(cookieParser());

// Parse JSON and URL-encoded data with size limits
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Welcome route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to LMS API' });
});

// Import route files
const landingRoutes = require('./routes/landing_routes');
const authRoutes = require('./routes/auth_routes');
const protectedRoutes = require('./routes/protected_routes');
const userRoutes = require('./routes/user_routes');
const uploadRoutes = require('./routes/upload_routes');
const studentCourseRoutes = require('./routes/student/course_routes');
const studentMentorshipRoutes = require('./routes/student/mentorship_routes');
const studentEventRoutes = require('./routes/student/event_routes');
const studentActivityRoutes = require('./routes/student_activity_route');
const studentCalendarRoutes = require('./routes/student/calendar_routes');
const notificationPermissionRoutes = require('./routes/notification_permission_routes');
const instructorMentorshipRoutes = require('./routes/instructor/mentorship_routes');
const instructorEventRoutes = require('./routes/instructor/event_routes');
const instructorCourseRoutes = require('./routes/instructor/course_routes');

// Use routes with API prefixes
app.use('/api/landing', landingRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/protected', protectedRoutes);
app.use('/api/users', userRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/student/courses', studentCourseRoutes);
app.use('/api/student/mentorship', studentMentorshipRoutes);
app.use('/api/student/events', studentEventRoutes);
app.use('/api/student/activity', studentActivityRoutes);
app.use('/api/student/calendar', studentCalendarRoutes);
app.use('/api/notification-permissions', notificationPermissionRoutes);
app.use('/api/instructor/mentorship', instructorMentorshipRoutes);
app.use('/api/instructor/events', instructorEventRoutes);
app.use('/api/instructor', instructorCourseRoutes);

// Serve uploaded files (e.g., profile pictures)
app.use('/uploads', express.static(path.join(__dirname, '../Uploads')));

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

module.exports = app;