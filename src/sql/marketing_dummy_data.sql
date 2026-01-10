-- ============================================================================
-- MARKETING CAMPAIGNS DUMMY DATA
-- ============================================================================

USE magnetix_db;

-- Get admin user UUID for created_by (using first admin user)
SET @admin_uuid = (SELECT user_id FROM admins LIMIT 1);

-- Insert dummy campaigns
INSERT INTO marketing_campaigns (
  uuid,
  title,
  subject,
  message,
  target_audience,
  delivery_method,
  status,
  recipient_count,
  total_sent,
  total_delivered,
  total_opened,
  total_clicked,
  scheduled_for,
  sent_at,
  created_by,
  created_at
) VALUES
(
  UUID(),
  'Welcome to New Learning Platform',
  'Welcome! Start Your Learning Journey Today',
  'Hello! We are excited to welcome you to our new learning management system. Explore hundreds of courses, track your progress, and earn certificates. Get started today!',
  '{"roles": [3], "departments": [], "specificUsers": []}',
  'both',
  'sent',
  150,
  150,
  148,
  120,
  45,
  NULL,
  DATE_SUB(NOW(), INTERVAL 15 DAY),
  @admin_uuid,
  DATE_SUB(NOW(), INTERVAL 15 DAY)
),
(
  UUID(),
  'New Course Alert: Advanced JavaScript',
  'Exciting New Course Available!',
  'Check out our latest course on Advanced JavaScript. Learn modern ES6+ features, async programming, and build real-world projects. Enroll now and get 20% off!',
  '{"roles": [3], "departments": ["Engineering", "IT"], "specificUsers": []}',
  'notification',
  'sent',
  85,
  85,
  82,
  65,
  28,
  NULL,
  DATE_SUB(NOW(), INTERVAL 10 DAY),
  @admin_uuid,
  DATE_SUB(NOW(), INTERVAL 10 DAY)
),
(
  UUID(),
  'Complete Your Profile for Better Recommendations',
  'Personalize Your Learning Experience',
  'Complete your profile to get personalized course recommendations tailored to your interests and career goals. It only takes 2 minutes!',
  '{"roles": [3], "departments": [], "specificUsers": []}',
  'email',
  'sent',
  200,
  200,
  195,
  150,
  89,
  NULL,
  DATE_SUB(NOW(), INTERVAL 7 DAY),
  @admin_uuid,
  DATE_SUB(NOW(), INTERVAL 7 DAY)
),
(
  UUID(),
  'Monthly Learning Report - December',
  'Your December Learning Summary',
  'Great progress this month! You completed 3 courses and earned 2 certificates. View your full learning report and see how you compare with your peers.',
  '{"roles": [3], "departments": [], "specificUsers": []}',
  'both',
  'sent',
  180,
  180,
  178,
  145,
  67,
  NULL,
  DATE_SUB(NOW(), INTERVAL 5 DAY),
  @admin_uuid,
  DATE_SUB(NOW(), INTERVAL 5 DAY)
),
(
  UUID(),
  'Upcoming Live Session: React Best Practices',
  'Join Our Live Workshop!',
  'Join us for a live workshop on React Best Practices this Friday at 2 PM. Our expert instructor will cover hooks, performance optimization, and state management. Register now - limited seats!',
  '{"roles": [3], "departments": ["Engineering"], "specificUsers": []}',
  'notification',
  'scheduled',
  0,
  0,
  0,
  0,
  0,
  DATE_ADD(NOW(), INTERVAL 2 DAY),
  NULL,
  @admin_uuid,
  DATE_SUB(NOW(), INTERVAL 3 DAY)
),
(
  UUID(),
  'End of Year Sale - All Courses 50% Off',
  'Limited Time Offer: 50% Off All Courses!',
  'Don\'t miss our biggest sale of the year! Get 50% off all courses until December 31st. Invest in your future and save big. Use code: NEWYEAR50',
  '{"roles": [3, 2], "departments": [], "specificUsers": []}',
  'both',
  'draft',
  0,
  0,
  0,
  0,
  0,
  NULL,
  NULL,
  @admin_uuid,
  DATE_SUB(NOW(), INTERVAL 1 DAY)
),
(
  UUID(),
  'System Maintenance Notification',
  'Scheduled Maintenance on Sunday',
  'Please note: Our platform will undergo scheduled maintenance this Sunday from 2 AM to 6 AM EST. During this time, the platform will be temporarily unavailable. We apologize for any inconvenience.',
  '{"roles": [1, 2, 3], "departments": [], "specificUsers": []}',
  'email',
  'scheduled',
  0,
  0,
  0,
  0,
  0,
  DATE_ADD(NOW(), INTERVAL 5 DAY),
  NULL,
  @admin_uuid,
  NOW()
);

-- Verification
SELECT
  COUNT(*) as total_campaigns,
  SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
  SUM(CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END) as scheduled,
  SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft
FROM marketing_campaigns
WHERE is_deleted = 0;
