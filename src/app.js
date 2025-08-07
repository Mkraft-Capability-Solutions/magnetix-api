const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");

const app = express();

// CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(cookieParser());

// Parse JSON and URL-encoded data with size limits
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "10mb" }));

// Import route files
const landingRoutes = require("./routes/landing_routes");
const authRoutes = require("./routes/auth_routes");
const protectedRoutes = require("./routes/protected_routes");
const userRoutes = require("./routes/user_routes");
const studentCourseRoutes = require("./routes/student/course_routes");
const studentMentorshipRoutes = require("./routes/student/mentorship_routes");
const studentEventRoutes = require("./routes/student/event_routes");
const studentActivityRoutes = require("./routes/student_activity_route");
const studentCalendarRoutes = require("./routes/student/calendar_routes");
const notificationPermissionRoutes = require("./routes/notification_permission_routes");
const instructorMentorshipRoutes = require("./routes/instructor/mentorship_routes");
const instructorEventRoutes = require("./routes/instructor/event_routes");

// Use routes with API prefixes
app.use("/landing", landingRoutes);
app.use("/auth", authRoutes);
app.use("/protected", protectedRoutes);
app.use("/users", userRoutes);
app.use("/student/courses", studentCourseRoutes);
app.use("/student/mentorship", studentMentorshipRoutes);
app.use("/student/events", studentEventRoutes);
app.use("/student/activity", studentActivityRoutes);
app.use("/student/calendar", studentCalendarRoutes);
app.use("/notification-permissions", notificationPermissionRoutes);
app.use("/instructor/mentorship", instructorMentorshipRoutes);
app.use("/instructor/events", instructorEventRoutes);

// Serve uploaded files (e.g., profile pictures)
app.use("/uploads", express.static(path.join(__dirname, "../Uploads")));

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: err.message || "Something broke!",
    error: process.env.NODE_ENV === "development" ? err : {},
  });
});

module.exports = app;
