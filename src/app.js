const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");

const app = express();

// CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL,
  credentials: true,
  methods: ["GET", "POST","PATCH", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Origin", "Content-Type", "Accept", "Authorization"],
};

app.use(cors(corsOptions));
app.use(cookieParser());

// Parse JSON and URL-encoded data with size limits
app.use(bodyParser.json({ limit: "1gb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "1gb" }));

const landingRoutes = require("./routes/landing_routes");
const authRoutes = require("./routes/auth_routes");
const protectedRoutes = require("./routes/protected_routes");
const userRoutes = require("./routes/user_routes");
const uploadRoutes = require("./routes/upload_routes");
const studentCourseRoutes = require("./routes/student/course_routes");
const studentMentorshipRoutes = require("./routes/student/mentorship_routes");
const studentEventRoutes = require("./routes/student/event_routes");
const studentActivityRoutes = require("./routes/student_activity_route");
const studentCalendarRoutes = require("./routes/student/calendar_routes");
const studentInstructorAvailabilityRoutes = require("./routes/student/instructor_availability_routes");
const notificationPermissionRoutes = require("./routes/notification_permission_routes");
const instructorMentorshipRoutes = require("./routes/instructor/mentorship_routes");
const instructorEventRoutes = require("./routes/instructor/event_routes");
const instructorCourseRoutes = require("./routes/instructor/course_routes");
const instructorNotificationRoutes = require("./routes/instructor/notification_routes");
const instructorAvailabilityRoutes = require("./routes/instructor/availability_routes");
const adminInstructorRoutes = require("./routes/admin/instructor_routes");
const adminStudentRoutes = require("./routes/admin/student_routes");
const adminEventRoutes = require("./routes/admin/event_routes");
const adminReminderRoutes = require("./routes/admin/reminder_routes");

// Use routes with API prefixes
app.use("/landing", landingRoutes);
app.use("/auth", authRoutes);
app.use("/protected", protectedRoutes);
app.use("/users", userRoutes);
app.use("/content/uploads", uploadRoutes);
app.use("/student/courses", studentCourseRoutes);
app.use("/student/mentorship", studentMentorshipRoutes);
app.use("/student/events", studentEventRoutes);
app.use("/student/activity", studentActivityRoutes);
app.use("/student/calendar", studentCalendarRoutes);
app.use("/student/instructor-availability", studentInstructorAvailabilityRoutes);
app.use("/notification-permissions", notificationPermissionRoutes);
app.use("/instructor/mentorship", instructorMentorshipRoutes);
app.use("/instructor/events", instructorEventRoutes);
app.use("/instructor/notifications", instructorNotificationRoutes);
app.use("/instructor", instructorAvailabilityRoutes);
app.use("/instructor", instructorCourseRoutes);
app.use("/admin/instructors", adminInstructorRoutes);
app.use("/admin/students", adminStudentRoutes);
app.use("/admin/events", adminEventRoutes);
app.use("/admin/reminders", adminReminderRoutes);
app.use("/admin/profile", require("./routes/admin/profile_route"));
app.use("/admin/courses", require("./routes/admin/course_route"));
// Serve uploaded files (e.g., profile pictures)
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
    error: process.env.NODE_ENV === "development" ? err : {},
  });
});

module.exports = app;
