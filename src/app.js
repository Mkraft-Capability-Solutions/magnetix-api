const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");

const app = express();

// CORS configuration
const corsOptions = {
  origin: [process.env.FRONTEND_URL, process.env.ASSESSMENT_URL],
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
const studentAnnouncementRoutes = require("./routes/student/announcement_routes");
const studentDashboardRoutes = require("./routes/student/dashboard_routes");
const studentTranscriptRoutes = require("./routes/student/transcript_routes");
const studentInstructorAvailabilityRoutes = require("./routes/student/instructor_availability_routes");
const studentInstructorProfileRoutes = require("./routes/student/instructor_profile_routes");
const studentCertificatesRoutes = require("./routes/student/certificates_routes");
const studentAchievementsRoutes = require("./routes/student/achievements_routes");
const studentCorporateInfoRoutes = require("./routes/student/corporate_info_routes");
const notificationPermissionRoutes = require("./routes/notification_permission_routes");
const instructorMentorshipRoutes = require("./routes/instructor/mentorship_routes");
const instructorEventRoutes = require("./routes/instructor/event_routes");
const instructorCourseRoutes = require("./routes/instructor/course_routes");
const instructorNotificationRoutes = require("./routes/instructor/notification_routes");
const instructorAvailabilityRoutes = require("./routes/instructor/availability_routes");
const instructorProfileRoutes = require("./routes/instructor/instructor_profile_routes");
const adminInstructorRoutes = require("./routes/admin/instructor_routes");
const adminStudentRoutes = require("./routes/admin/student_routes");
const adminEventRoutes = require("./routes/admin/event_routes");
const adminReminderRoutes = require("./routes/admin/reminder_routes");
const adminBatchRoutes = require("./routes/admin/batch_routes");
const adminSessionRoutes = require("./routes/admin/session_routes");
const googleMeetRoutes = require("./routes/google/meet_routes");
const googleOAuthRoutes = require("./routes/google/oauth_routes");
const supportRoutes = require("./routes/support_routes");

// Use routes with API prefixes
app.use("/api/landing", landingRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/protected", protectedRoutes);
app.use("/api/users", userRoutes);
app.use("/api/content/uploads", uploadRoutes);
app.use("/api/student/courses", studentCourseRoutes);
app.use("/api/student/mentorship", studentMentorshipRoutes);
app.use("/api/student/events", studentEventRoutes);
app.use("/api/student/activity", studentActivityRoutes);
app.use("/api/student/calendar", studentCalendarRoutes);
app.use("/api/student/announcements", studentAnnouncementRoutes);
app.use("/api/student/dashboard", studentDashboardRoutes);
app.use("/api/student/transcript", studentTranscriptRoutes);
app.use("/api/student/instructor-availability", studentInstructorAvailabilityRoutes);
app.use("/api/student/instructor-profile", studentInstructorProfileRoutes);
app.use("/api/student/certificates", studentCertificatesRoutes);
app.use("/api/student/achievements", studentAchievementsRoutes);
app.use("/api/student/corporate-info", studentCorporateInfoRoutes);
app.use("/api/notification-permissions", notificationPermissionRoutes);
app.use("/api/instructor/mentorship", instructorMentorshipRoutes);
app.use("/api/instructor/events", instructorEventRoutes);
app.use("/api/instructor/notifications", instructorNotificationRoutes);
app.use("/api/instructor", instructorProfileRoutes);
app.use("/api/instructor", instructorAvailabilityRoutes);
app.use("/api/instructor", instructorCourseRoutes);
app.use("/api/admin/instructors", adminInstructorRoutes);
app.use("/api/admin/students", adminStudentRoutes);
app.use("/api/admin/events", adminEventRoutes);
app.use("/api/admin/reminders", adminReminderRoutes);
app.use("/api/admin/batches", adminBatchRoutes);
app.use("/api/admin/mentorship/sessions", adminSessionRoutes);
app.use("/api/admin/profile", require("./routes/admin/profile_route"));
app.use("/api/admin/courses", require("./routes/admin/course_route"));
app.use("/api/google/meet", googleMeetRoutes);
app.use("/api/google/oauth", googleOAuthRoutes);
app.use("/api/support", supportRoutes);
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
