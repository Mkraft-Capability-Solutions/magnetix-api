-- ============================================================================
-- NOTIFICATIONS DUMMY DATA
-- ============================================================================

USE magnetix_db;

-- Get user UUIDs for notifications (students, admins, instructors)
SET @student_uuid1 = (SELECT user_id FROM students LIMIT 1);
SET @student_uuid2 = (SELECT user_id FROM students LIMIT 1 OFFSET 1);
SET @student_uuid3 = (SELECT user_id FROM students LIMIT 1 OFFSET 2);
SET @admin_uuid = (SELECT user_id FROM admins LIMIT 1);
SET @instructor_uuid = (SELECT user_id FROM instructors LIMIT 1);

-- Insert dummy notifications for students
INSERT INTO notifications (
  uuid,
  title,
  message,
  notification_type,
  icon,
  action_url,
  recipient_id,
  delivery_method,
  campaign_id,
  metadata,
  is_read,
  created_at
) VALUES
-- Unread notifications for student 1
(
  UUID(),
  'New Course Available: Advanced JavaScript',
  'Check out our latest course on Advanced JavaScript. Learn modern ES6+ features, async programming, and build real-world projects.',
  'course',
  'book',
  '/trainee/browse',
  @student_uuid1,
  'in-app',
  NULL,
  '{"course_id": 1, "instructor": "John Doe"}',
  0,
  DATE_SUB(NOW(), INTERVAL 2 HOUR)
),
(
  UUID(),
  'Upcoming Live Session: React Best Practices',
  'Join us for a live workshop on React Best Practices tomorrow at 2 PM. Register now - limited seats available!',
  'event',
  'calendar',
  '/trainee/events',
  @student_uuid1,
  'in-app',
  NULL,
  '{"event_id": 5, "date": "2026-01-12"}',
  0,
  DATE_SUB(NOW(), INTERVAL 5 HOUR)
),
(
  UUID(),
  'Certificate Earned!',
  'Congratulations! You have successfully completed "Introduction to Python" and earned your certificate.',
  'system',
  'award',
  '/trainee/certifications',
  @student_uuid1,
  'both',
  NULL,
  '{"course_id": 10, "certificate_id": 123}',
  0,
  DATE_SUB(NOW(), INTERVAL 1 DAY)
),

-- Read notifications for student 1
(
  UUID(),
  'Welcome to the Learning Platform',
  'Hello! We are excited to welcome you to our learning management system. Explore courses, track your progress, and earn certificates.',
  'system',
  'bell',
  '/trainee/my-learnings',
  @student_uuid1,
  'both',
  NULL,
  '{}',
  1,
  DATE_SUB(NOW(), INTERVAL 7 DAY)
),
(
  UUID(),
  'Course Progress Reminder',
  'You are 50% through "JavaScript Fundamentals". Keep going to complete the course!',
  'course',
  'book',
  '/trainee/my-learnings',
  @student_uuid1,
  'in-app',
  NULL,
  '{"course_id": 2, "progress": 50}',
  1,
  DATE_SUB(NOW(), INTERVAL 3 DAY)
),

-- Notifications for student 2
(
  UUID(),
  'New Announcement: Platform Maintenance',
  'Our platform will undergo scheduled maintenance this Sunday from 2 AM to 6 AM EST. Please plan accordingly.',
  'announcement',
  'megaphone',
  NULL,
  @student_uuid2,
  'both',
  NULL,
  '{"priority": "high"}',
  0,
  DATE_SUB(NOW(), INTERVAL 1 HOUR)
),
(
  UUID(),
  'Course Enrollment Confirmed',
  'You have successfully enrolled in "Data Science Fundamentals". Start learning today!',
  'course',
  'book',
  '/trainee/my-learnings',
  @student_uuid2,
  'in-app',
  NULL,
  '{"course_id": 15}',
  0,
  DATE_SUB(NOW(), INTERVAL 6 HOUR)
),

-- Notifications for student 3
(
  UUID(),
  'Monthly Learning Report Available',
  'Your December learning summary is ready! You completed 3 courses and earned 2 certificates.',
  'system',
  'chart',
  '/trainee/achievements',
  @student_uuid3,
  'email',
  NULL,
  '{"month": "December", "courses_completed": 3, "certificates": 2}',
  1,
  DATE_SUB(NOW(), INTERVAL 2 DAY)
),

-- Notifications for admin
(
  UUID(),
  'New Course Submission',
  'Instructor John Smith has submitted a new course "Machine Learning Basics" for review.',
  'instructor',
  'users',
  '/admin/courses',
  @admin_uuid,
  'in-app',
  NULL,
  '{"course_id": 20, "instructor_id": "abc123"}',
  0,
  DATE_SUB(NOW(), INTERVAL 30 MINUTE)
),
(
  UUID(),
  'System Alert: High User Activity',
  'Current active users: 500. System performance is optimal.',
  'system',
  'activity',
  '/admin/dashboard',
  @admin_uuid,
  'in-app',
  NULL,
  '{"active_users": 500, "load": "optimal"}',
  1,
  DATE_SUB(NOW(), INTERVAL 4 HOUR)
),

-- Notifications for instructor
(
  UUID(),
  'New Student Enrollment',
  '5 new students have enrolled in your course "Web Development Masterclass".',
  'course',
  'users',
  '/trainer/my-learnings',
  @instructor_uuid,
  'in-app',
  NULL,
  '{"course_id": 8, "new_students": 5}',
  0,
  DATE_SUB(NOW(), INTERVAL 3 HOUR)
),
(
  UUID(),
  'Course Rating Received',
  'Your course "Introduction to React" received a 5-star rating from a student!',
  'course',
  'star',
  '/trainer/my-learnings',
  @instructor_uuid,
  'in-app',
  NULL,
  '{"course_id": 12, "rating": 5}',
  0,
  DATE_SUB(NOW(), INTERVAL 8 HOUR)
);

-- Insert email logs for sent notifications
INSERT INTO email_logs (
  notification_id,
  campaign_id,
  recipient_email,
  status,
  sent_at
)
SELECT
  n.id,
  n.campaign_id,
  u.email,
  'sent',
  n.created_at
FROM notifications n
JOIN users u ON n.recipient_id = u.uuid
WHERE n.delivery_method IN ('email', 'both')
  AND u.email IS NOT NULL;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Count notifications by type
SELECT
  notification_type,
  COUNT(*) as total,
  SUM(CASE WHEN is_read = 0 THEN 1 ELSE 0 END) as unread,
  SUM(CASE WHEN is_read = 1 THEN 1 ELSE 0 END) as read_count
FROM notifications
WHERE is_deleted = 0
GROUP BY notification_type;

-- Count unread notifications by user
SELECT
  recipient_id,
  COUNT(*) as unread_count
FROM notifications
WHERE is_read = 0 AND is_deleted = 0
GROUP BY recipient_id;

-- Show recent notifications
SELECT
  uuid,
  title,
  notification_type,
  is_read,
  created_at
FROM notifications
ORDER BY created_at DESC
LIMIT 10;
