const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");

const app = express();

require("dotenv").config();

const allowedOrigins = [
  "http://localhost:3000",
  process.env.FRONTEND_URL,
  process.env.ASSESSMENT_URL,
  "https://magnetix-prod.web.app","https://mkraftmagnetix.com"
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // allow Postman / curl / server-to-server
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.error("❌ Blocked by CORS:", origin);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-api-key"]
}));

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
const studentCertificationRoutes = require("./routes/student/certification_routes");
const studentAchievementsRoutes = require("./routes/student/achievements_routes");
const studentCorporateInfoRoutes = require("./routes/student/corporate_info_routes");
const studentAILearningPathRoutes = require("./routes/student/ai_learning_path_routes");
const notificationPermissionRoutes = require("./routes/notification_permission_routes");
const instructorMentorshipRoutes = require("./routes/instructor/mentorship_routes");
const instructorEventRoutes = require("./routes/instructor/event_routes");
const instructorCourseRoutes = require("./routes/instructor/course_routes");
const instructorNotificationRoutes = require("./routes/instructor/notification_routes");
const instructorAvailabilityRoutes = require("./routes/instructor/availability_routes");
const instructorProfileRoutes = require("./routes/instructor/instructor_profile_routes");
const instructorDashboardRoutes = require("./routes/instructor/dashboard_routes");
const instructorReportRoutes = require("./routes/instructor/report_routes");
const instructorTeamRoutes = require("./routes/instructor/team_routes");
const instructorUserManagementRoutes = require("./routes/instructor/user_management_routes");
const instructorMarketingRoutes = require("./routes/instructor/marketing_routes");
const instructorILTRoutes = require("./routes/instructor/ilt_routes");
const instructorBatchRoutes = require("./routes/instructor/batch_routes");
const adminInstructorRoutes = require("./routes/admin/instructor_routes");
const adminStudentRoutes = require("./routes/admin/student_routes");
const adminEventRoutes = require("./routes/admin/event_routes");
const adminReminderRoutes = require("./routes/admin/reminder_routes");
const adminBatchRoutes = require("./routes/admin/batch_routes");
const adminSessionRoutes = require("./routes/admin/session_routes");
const googleMeetRoutes = require("./routes/google/meet_routes");
const googleOAuthRoutes = require("./routes/google/oauth_routes");
const supportRoutes = require("./routes/support_routes");
const adminDashboardRoutes = require("./routes/admin/dashboard_routes");
const adminSettingsRoutes = require("./routes/admin/settings_routes");
const adminUserManagementRoutes = require("./routes/admin/user_management_routes");
const adminReportRoutes = require("./routes/admin/report_routes");
const adminReportSchedulerRoutes = require("./routes/admin/report_scheduler_routes");
const adminCustomReportRoutes = require("./routes/admin/custom_report_routes");
const adminTeamRoutes = require("./routes/admin/team_routes");
const adminILTRoutes = require("./routes/admin/ilt_routes");
const adminBulkUploadRoutes = require("./routes/admin/bulk_upload_routes");
const adminLessonRoutes = require("./routes/admin/lesson_routes");
const adminLearningItemRoutes = require("./routes/admin/learning_item_routes");
const superAdminDashboardRoutes = require("./routes/super_admin/dashboard_routes");
const superAdminTeamRoutes = require("./routes/super_admin/team_routes");
const superAdminUserManagementRoutes = require("./routes/super_admin/user_management_routes");
const superAdminBulkUploadRoutes = require("./routes/super_admin/bulk_upload_routes");
const superAdminFeedbackRoutes = require("./routes/super_admin/feedback_routes");
const superAdminMarketingRoutes = require("./routes/super_admin/marketing_routes");
const superAdminILTRoutes = require("./routes/super_admin/ilt_routes");
const superAdminReportRoutes = require("./routes/super_admin/report_routes");
const superAdminLessonRoutes = require("./routes/super_admin/lesson_routes");
const superAdminOrganizationRoutes = require("./routes/super_admin/organization_routes");
const superAdminUserOrganizationRoutes = require("./routes/super_admin/user_organization_routes");

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
app.use("/api/student", studentCertificationRoutes);
app.use("/api/student/achievements", studentAchievementsRoutes);
app.use("/api/student/corporate-info", studentCorporateInfoRoutes);
app.use("/api/student/ai-learning-path", studentAILearningPathRoutes);
app.use("/api/notification-permissions", notificationPermissionRoutes);
app.use("/api/instructor/mentorship", instructorMentorshipRoutes);
app.use("/api/instructor/events", instructorEventRoutes);
app.use("/api/instructor/notifications", instructorNotificationRoutes);
app.use("/api/instructor", instructorProfileRoutes);
app.use("/api/instructor", instructorAvailabilityRoutes);
app.use("/api/instructor", instructorCourseRoutes);
app.use("/api/instructor/dashboard", instructorDashboardRoutes);
app.use("/api/instructor/reports", instructorReportRoutes);
app.use("/api/instructor/teams", instructorTeamRoutes);
app.use("/api/instructor/users", instructorUserManagementRoutes);
app.use("/api/instructor/marketing", instructorMarketingRoutes);
app.use("/api/instructor/ilt", instructorILTRoutes);
app.use("/api/instructor/batches", instructorBatchRoutes);
app.use("/api/instructor/group-projects", require("./routes/trainer/group_project_routes"));
app.use("/api/admin/instructors", adminInstructorRoutes);
app.use("/api/admin/students", adminStudentRoutes);
app.use("/api/admin/events", adminEventRoutes);
app.use("/api/admin/reminders", adminReminderRoutes);
app.use("/api/admin/batches", adminBatchRoutes);
app.use("/api/admin/mentorship/sessions", adminSessionRoutes);
app.use("/api/admin/profile", require("./routes/admin/profile_route"));
app.use("/api/admin/courses", require("./routes/admin/course_route"));
app.use("/api/admin/catalog", require("./routes/admin/catalog_routes"));
app.use("/api/admin/group-projects", require("./routes/admin/group_project_routes"));
app.use("/api/admin", require("./routes/admin/certification_routes"));
app.use("/api/admin", require("./routes/admin/user_certificate_routes"));
app.use("/api/admin", require("./routes/admin/external_certificates_routes"));
app.use("/api/admin/dashboard", adminDashboardRoutes);
app.use("/api/admin/settings", adminSettingsRoutes);
app.use("/api/admin/users", adminUserManagementRoutes);
app.use("/api/admin/reports/schedules", adminReportSchedulerRoutes);
app.use("/api/admin/reports", adminReportRoutes);
app.use("/api/admin/custom-reports", adminCustomReportRoutes);
app.use("/api/admin/teams", adminTeamRoutes);
app.use("/api/admin/ilt", adminILTRoutes);
app.use("/api/admin/bulk-upload", adminBulkUploadRoutes);
app.use("/api/admin/content", adminLessonRoutes);
app.use("/api/admin/learning-items", adminLearningItemRoutes);
app.use("/api/google/meet", googleMeetRoutes);
app.use("/api/google/oauth", googleOAuthRoutes);
app.use("/api/support", supportRoutes);
app.use("/api/chatbot", require("./routes/chatbot_routes"));
app.use("/api/admin/marketing", require("./routes/admin/marketing_routes"));
app.use("/api/notifications", require("./routes/notification_routes"));
app.use("/api/admin/feedback", require("./routes/admin/feedback_routes"));
app.use("/api/admin/api-keys", require("./routes/admin/api_key_routes"));
app.use("/api/admin/knowledge-base", require("./routes/admin/knowledge_base_routes"));
app.use("/api/knowledge-base", require("./routes/knowledge_base_public_routes"));
app.use("/api/public/feedback", require("./routes/public/feedback_routes"));
app.use("/api/super-admin/dashboard", superAdminDashboardRoutes);
app.use("/api/super-admin/teams", superAdminTeamRoutes);
app.use("/api/super-admin/users", superAdminUserManagementRoutes);
app.use("/api/super-admin/bulk-upload", superAdminBulkUploadRoutes);
app.use("/api/super-admin/feedback", superAdminFeedbackRoutes);
app.use("/api/super-admin/marketing", superAdminMarketingRoutes);
app.use("/api/super-admin/ilt", superAdminILTRoutes);
app.use("/api/super-admin/reports", superAdminReportRoutes);
app.use("/api/super-admin/content", superAdminLessonRoutes);
app.use("/api/super-admin/catalog", require("./routes/super_admin/catalog_routes"));
app.use("/api/super-admin/group-projects", require("./routes/super_admin/group_project_routes"));
app.use("/api/super-admin/organizations", superAdminOrganizationRoutes);
app.use("/api/super-admin/users", superAdminUserOrganizationRoutes);

// SCORM manifest API endpoint
const { getScormEntryPoint, parseScormManifest } = require("./utils/scormManifestParser");

app.get("/api/scorm-manifest/:packageName", async (req, res) => {
  try {
    const { packageName } = req.params;
    const packagePath = path.join(__dirname, "../uploads/courses/lessons/scorm_packages", packageName);

    const manifestInfo = await parseScormManifest(packagePath);

    res.json({
      success: true,
      data: manifestInfo
    });
  } catch (error) {
    console.error("Error fetching SCORM manifest:", error);

    // Fallback: Try to get entry point only
    try {
      const { packageName } = req.params;
      const packagePath = path.join(__dirname, "../uploads/courses/lessons/scorm_packages", packageName);
      const entryPoint = await getScormEntryPoint(packagePath);

      res.json({
        success: true,
        data: {
          entryPoint,
          scormVersion: "1.2",
          title: "SCORM Content",
          fallback: true
        }
      });
    } catch (fallbackError) {
      res.status(500).json({
        success: false,
        message: "Failed to parse SCORM manifest",
        error: fallbackError.message
      });
    }
  }
});

// Serve uploaded files (e.g., profile pictures)
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

  // Also serve uploads through /socket/uploads path for compatibility
  app.use("/socket/uploads", express.static(path.join(__dirname, "../uploads")));

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
