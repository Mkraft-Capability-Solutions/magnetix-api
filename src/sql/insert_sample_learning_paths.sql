-- ========================================
-- AI LEARNING PATHS SAMPLE DATA
-- ========================================
-- Inserts sample learning paths for test user
-- User UUID: 4313a2aa-ee2b-4a8d-98af-9c94f99b3626
-- ========================================

USE lms_db;

-- ========================================
-- LEARNING PATH 1: Full Stack Web Development
-- ========================================
-- Status: In Progress (20% complete)
-- Modules: 5 total, 1 completed, 1 in progress
-- ========================================

INSERT INTO `ai_learning_paths` (
  `user_id`,
  `title`,
  `description`,
  `type`,
  `difficulty_level`,
  `total_modules`,
  `completed_modules`,
  `progress`,
  `status`,
  `estimated_duration_weeks`,
  `time_spent_hours`,
  `last_accessed`,
  `created_at`,
  `updated_at`
) VALUES (
  '4313a2aa-ee2b-4a8d-98af-9c94f99b3626',
  'Full Stack Web Development',
  'Master modern web development from frontend to backend. Build complete applications using React, Node.js, Express, and MongoDB. Learn industry best practices and deployment strategies.',
  'ai_generated',
  'intermediate',
  5,
  1,
  20.00,
  'in_progress',
  16,
  24.50,
  NOW(),
  DATE_SUB(NOW(), INTERVAL 15 DAY),
  NOW()
);

-- Get the last inserted learning path ID
SET @path1_id = LAST_INSERT_ID();

-- Module 1: HTML & CSS Fundamentals (COMPLETED)
INSERT INTO `ai_learning_path_modules` (
  `learning_path_id`,
  `module_order`,
  `title`,
  `description`,
  `duration_weeks`,
  `status`,
  `score`,
  `progress`,
  `started_at`,
  `completed_at`,
  `created_at`,
  `updated_at`
) VALUES (
  @path1_id,
  1,
  'HTML & CSS Fundamentals',
  'Master the building blocks of web pages. Learn semantic HTML5, modern CSS3 techniques, responsive design principles, and layout systems including Flexbox and Grid.',
  2,
  'completed',
  92.00,
  100.00,
  DATE_SUB(NOW(), INTERVAL 15 DAY),
  DATE_SUB(NOW(), INTERVAL 8 DAY),
  DATE_SUB(NOW(), INTERVAL 15 DAY),
  DATE_SUB(NOW(), INTERVAL 8 DAY)
);

SET @module1_id = LAST_INSERT_ID();

-- Topics for Module 1
INSERT INTO `ai_learning_path_module_topics` (`module_id`, `topic_name`, `topic_order`, `is_completed`) VALUES
(@module1_id, 'HTML5 Semantic Structure', 1, TRUE),
(@module1_id, 'CSS3 Styling & Selectors', 2, TRUE),
(@module1_id, 'Responsive Design Principles', 3, TRUE),
(@module1_id, 'Flexbox Layout System', 4, TRUE),
(@module1_id, 'CSS Grid Layout', 5, TRUE);

-- Module 2: JavaScript Essentials (IN PROGRESS)
INSERT INTO `ai_learning_path_modules` (
  `learning_path_id`,
  `module_order`,
  `title`,
  `description`,
  `duration_weeks`,
  `status`,
  `score`,
  `progress`,
  `started_at`,
  `completed_at`,
  `created_at`,
  `updated_at`
) VALUES (
  @path1_id,
  2,
  'JavaScript Essentials',
  'Learn JavaScript from basics to advanced concepts. Cover ES6+ features, asynchronous programming, DOM manipulation, and modern JavaScript patterns.',
  3,
  'in_progress',
  NULL,
  45.00,
  DATE_SUB(NOW(), INTERVAL 7 DAY),
  NULL,
  DATE_SUB(NOW(), INTERVAL 15 DAY),
  NOW()
);

SET @module2_id = LAST_INSERT_ID();

-- Topics for Module 2
INSERT INTO `ai_learning_path_module_topics` (`module_id`, `topic_name`, `topic_order`, `is_completed`) VALUES
(@module2_id, 'Variables & Data Types', 1, TRUE),
(@module2_id, 'Functions & Scope', 2, TRUE),
(@module2_id, 'DOM Manipulation', 3, TRUE),
(@module2_id, 'Async Programming & Promises', 4, FALSE),
(@module2_id, 'ES6+ Modern Features', 5, FALSE);

-- Module 3: React Fundamentals (LOCKED)
INSERT INTO `ai_learning_path_modules` (
  `learning_path_id`,
  `module_order`,
  `title`,
  `description`,
  `duration_weeks`,
  `status`,
  `score`,
  `progress`,
  `started_at`,
  `completed_at`,
  `created_at`,
  `updated_at`
) VALUES (
  @path1_id,
  3,
  'React Fundamentals',
  'Build modern user interfaces with React. Learn components, hooks, state management, routing, and best practices for scalable applications.',
  4,
  'locked',
  NULL,
  0.00,
  NULL,
  NULL,
  DATE_SUB(NOW(), INTERVAL 15 DAY),
  DATE_SUB(NOW(), INTERVAL 15 DAY)
);

SET @module3_id = LAST_INSERT_ID();

-- Topics for Module 3
INSERT INTO `ai_learning_path_module_topics` (`module_id`, `topic_name`, `topic_order`, `is_completed`) VALUES
(@module3_id, 'React Components & JSX', 1, FALSE),
(@module3_id, 'State Management with Hooks', 2, FALSE),
(@module3_id, 'React Router & Navigation', 3, FALSE),
(@module3_id, 'Context API & Global State', 4, FALSE),
(@module3_id, 'Performance Optimization', 5, FALSE);

-- Module 4: Backend with Node.js (LOCKED)
INSERT INTO `ai_learning_path_modules` (
  `learning_path_id`,
  `module_order`,
  `title`,
  `description`,
  `duration_weeks`,
  `status`,
  `score`,
  `progress`,
  `started_at`,
  `completed_at`,
  `created_at`,
  `updated_at`
) VALUES (
  @path1_id,
  4,
  'Backend Development with Node.js',
  'Create powerful RESTful APIs using Node.js and Express. Learn database integration, authentication, middleware, and API security best practices.',
  4,
  'locked',
  NULL,
  0.00,
  NULL,
  NULL,
  DATE_SUB(NOW(), INTERVAL 15 DAY),
  DATE_SUB(NOW(), INTERVAL 15 DAY)
);

SET @module4_id = LAST_INSERT_ID();

-- Topics for Module 4
INSERT INTO `ai_learning_path_module_topics` (`module_id`, `topic_name`, `topic_order`, `is_completed`) VALUES
(@module4_id, 'Node.js & Express Setup', 1, FALSE),
(@module4_id, 'RESTful API Design', 2, FALSE),
(@module4_id, 'Database Integration (MongoDB)', 3, FALSE),
(@module4_id, 'Authentication & Authorization', 4, FALSE),
(@module4_id, 'API Security & Error Handling', 5, FALSE);

-- Module 5: Full Stack Project (LOCKED)
INSERT INTO `ai_learning_path_modules` (
  `learning_path_id`,
  `module_order`,
  `title`,
  `description`,
  `duration_weeks`,
  `status`,
  `score`,
  `progress`,
  `started_at`,
  `completed_at`,
  `created_at`,
  `updated_at`
) VALUES (
  @path1_id,
  5,
  'Full Stack Capstone Project',
  'Build a complete full-stack application from scratch. Implement authentication, CRUD operations, real-time features, and deploy to production.',
  3,
  'locked',
  NULL,
  0.00,
  NULL,
  NULL,
  DATE_SUB(NOW(), INTERVAL 15 DAY),
  DATE_SUB(NOW(), INTERVAL 15 DAY)
);

SET @module5_id = LAST_INSERT_ID();

-- Topics for Module 5
INSERT INTO `ai_learning_path_module_topics` (`module_id`, `topic_name`, `topic_order`, `is_completed`) VALUES
(@module5_id, 'Project Planning & Architecture', 1, FALSE),
(@module5_id, 'Frontend Implementation', 2, FALSE),
(@module5_id, 'Backend Implementation', 3, FALSE),
(@module5_id, 'Testing & Debugging', 4, FALSE),
(@module5_id, 'Deployment & Production', 5, FALSE);

-- ========================================
-- LEARNING PATH 2: Python for Data Science
-- ========================================
-- Status: In Progress (50% complete)
-- Modules: 4 total, 2 completed, 1 in progress
-- ========================================

INSERT INTO `ai_learning_paths` (
  `user_id`,
  `title`,
  `description`,
  `type`,
  `difficulty_level`,
  `total_modules`,
  `completed_modules`,
  `progress`,
  `status`,
  `estimated_duration_weeks`,
  `time_spent_hours`,
  `last_accessed`,
  `created_at`,
  `updated_at`
) VALUES (
  '4313a2aa-ee2b-4a8d-98af-9c94f99b3626',
  'Python for Data Science',
  'Comprehensive data science journey with Python. Master data manipulation, visualization, statistical analysis, and machine learning fundamentals using industry-standard libraries.',
  'custom',
  'intermediate',
  4,
  2,
  50.00,
  'in_progress',
  12,
  38.75,
  DATE_SUB(NOW(), INTERVAL 2 DAY),
  DATE_SUB(NOW(), INTERVAL 30 DAY),
  DATE_SUB(NOW(), INTERVAL 2 DAY)
);

SET @path2_id = LAST_INSERT_ID();

-- Module 1: Python Basics (COMPLETED)
INSERT INTO `ai_learning_path_modules` (
  `learning_path_id`,
  `module_order`,
  `title`,
  `description`,
  `duration_weeks`,
  `status`,
  `score`,
  `progress`,
  `started_at`,
  `completed_at`,
  `created_at`,
  `updated_at`
) VALUES (
  @path2_id,
  1,
  'Python Programming Fundamentals',
  'Master Python syntax and core programming concepts. Learn data structures, control flow, functions, OOP principles, and Python best practices.',
  2,
  'completed',
  88.00,
  100.00,
  DATE_SUB(NOW(), INTERVAL 30 DAY),
  DATE_SUB(NOW(), INTERVAL 21 DAY),
  DATE_SUB(NOW(), INTERVAL 30 DAY),
  DATE_SUB(NOW(), INTERVAL 21 DAY)
);

SET @module6_id = LAST_INSERT_ID();

-- Topics for Module 1
INSERT INTO `ai_learning_path_module_topics` (`module_id`, `topic_name`, `topic_order`, `is_completed`) VALUES
(@module6_id, 'Python Syntax & Variables', 1, TRUE),
(@module6_id, 'Data Structures (Lists, Dicts, Sets)', 2, TRUE),
(@module6_id, 'Functions & Modules', 3, TRUE),
(@module6_id, 'Object-Oriented Programming', 4, TRUE),
(@module6_id, 'File Handling & Exceptions', 5, TRUE);

-- Module 2: NumPy & Pandas (COMPLETED)
INSERT INTO `ai_learning_path_modules` (
  `learning_path_id`,
  `module_order`,
  `title`,
  `description`,
  `duration_weeks`,
  `status`,
  `score`,
  `progress`,
  `started_at`,
  `completed_at`,
  `created_at`,
  `updated_at`
) VALUES (
  @path2_id,
  2,
  'Data Manipulation with NumPy & Pandas',
  'Learn powerful data manipulation techniques using NumPy arrays and Pandas DataFrames. Master data cleaning, transformation, and analysis workflows.',
  3,
  'completed',
  91.00,
  100.00,
  DATE_SUB(NOW(), INTERVAL 20 DAY),
  DATE_SUB(NOW(), INTERVAL 10 DAY),
  DATE_SUB(NOW(), INTERVAL 30 DAY),
  DATE_SUB(NOW(), INTERVAL 10 DAY)
);

SET @module7_id = LAST_INSERT_ID();

-- Topics for Module 2
INSERT INTO `ai_learning_path_module_topics` (`module_id`, `topic_name`, `topic_order`, `is_completed`) VALUES
(@module7_id, 'NumPy Arrays & Operations', 1, TRUE),
(@module7_id, 'Pandas DataFrames & Series', 2, TRUE),
(@module7_id, 'Data Cleaning & Preprocessing', 3, TRUE),
(@module7_id, 'Data Aggregation & Grouping', 4, TRUE),
(@module7_id, 'Time Series Analysis', 5, TRUE);

-- Module 3: Data Visualization (IN PROGRESS)
INSERT INTO `ai_learning_path_modules` (
  `learning_path_id`,
  `module_order`,
  `title`,
  `description`,
  `duration_weeks`,
  `status`,
  `score`,
  `progress`,
  `started_at`,
  `completed_at`,
  `created_at`,
  `updated_at`
) VALUES (
  @path2_id,
  3,
  'Data Visualization Mastery',
  'Create stunning and informative visualizations using Matplotlib, Seaborn, and Plotly. Learn best practices for presenting data insights effectively.',
  4,
  'in_progress',
  NULL,
  30.00,
  DATE_SUB(NOW(), INTERVAL 9 DAY),
  NULL,
  DATE_SUB(NOW(), INTERVAL 30 DAY),
  DATE_SUB(NOW(), INTERVAL 2 DAY)
);

SET @module8_id = LAST_INSERT_ID();

-- Topics for Module 3
INSERT INTO `ai_learning_path_module_topics` (`module_id`, `topic_name`, `topic_order`, `is_completed`) VALUES
(@module8_id, 'Matplotlib Fundamentals', 1, TRUE),
(@module8_id, 'Seaborn Statistical Plots', 2, TRUE),
(@module8_id, 'Interactive Visualizations with Plotly', 3, FALSE),
(@module8_id, 'Dashboard Creation', 4, FALSE),
(@module8_id, 'Advanced Visualization Techniques', 5, FALSE);

-- Module 4: Machine Learning Basics (LOCKED)
INSERT INTO `ai_learning_path_modules` (
  `learning_path_id`,
  `module_order`,
  `title`,
  `description`,
  `duration_weeks`,
  `status`,
  `score`,
  `progress`,
  `started_at`,
  `completed_at`,
  `created_at`,
  `updated_at`
) VALUES (
  @path2_id,
  4,
  'Introduction to Machine Learning',
  'Learn fundamental machine learning concepts and algorithms using scikit-learn. Cover supervised and unsupervised learning, model evaluation, and deployment.',
  3,
  'locked',
  NULL,
  0.00,
  NULL,
  NULL,
  DATE_SUB(NOW(), INTERVAL 30 DAY),
  DATE_SUB(NOW(), INTERVAL 30 DAY)
);

SET @module9_id = LAST_INSERT_ID();

-- Topics for Module 4
INSERT INTO `ai_learning_path_module_topics` (`module_id`, `topic_name`, `topic_order`, `is_completed`) VALUES
(@module9_id, 'ML Fundamentals & Scikit-learn', 1, FALSE),
(@module9_id, 'Supervised Learning (Regression & Classification)', 2, FALSE),
(@module9_id, 'Unsupervised Learning (Clustering)', 3, FALSE),
(@module9_id, 'Model Evaluation & Hyperparameter Tuning', 4, FALSE),
(@module9_id, 'Model Deployment Basics', 5, FALSE);

-- ========================================
-- SKILLS DATA
-- ========================================
-- Skills gained from both learning paths
-- ========================================

INSERT INTO `ai_learning_path_skills` (
  `user_id`,
  `skill_name`,
  `skill_level`,
  `mastery_percentage`,
  `color`,
  `learning_path_id`,
  `created_at`,
  `updated_at`
) VALUES
-- Skills from Full Stack Web Development path
('4313a2aa-ee2b-4a8d-98af-9c94f99b3626', 'Web Development', 'advanced', 75.00, '#2563eb', @path1_id, DATE_SUB(NOW(), INTERVAL 15 DAY), NOW()),
('4313a2aa-ee2b-4a8d-98af-9c94f99b3626', 'React', 'intermediate', 60.00, '#61dafb', @path1_id, DATE_SUB(NOW(), INTERVAL 15 DAY), NOW()),
('4313a2aa-ee2b-4a8d-98af-9c94f99b3626', 'Node.js', 'intermediate', 45.00, '#68a063', @path1_id, DATE_SUB(NOW(), INTERVAL 15 DAY), NOW()),
('4313a2aa-ee2b-4a8d-98af-9c94f99b3626', 'JavaScript', 'advanced', 78.00, '#f7df1e', @path1_id, DATE_SUB(NOW(), INTERVAL 15 DAY), NOW()),
-- Skills from Python for Data Science path
('4313a2aa-ee2b-4a8d-98af-9c94f99b3626', 'Python', 'expert', 85.00, '#3776ab', @path2_id, DATE_SUB(NOW(), INTERVAL 30 DAY), DATE_SUB(NOW(), INTERVAL 2 DAY)),
('4313a2aa-ee2b-4a8d-98af-9c94f99b3626', 'Data Science', 'intermediate', 65.00, '#ff6f00', @path2_id, DATE_SUB(NOW(), INTERVAL 30 DAY), DATE_SUB(NOW(), INTERVAL 2 DAY)),
('4313a2aa-ee2b-4a8d-98af-9c94f99b3626', 'Data Visualization', 'intermediate', 55.00, '#e91e63', @path2_id, DATE_SUB(NOW(), INTERVAL 30 DAY), DATE_SUB(NOW(), INTERVAL 2 DAY)),
('4313a2aa-ee2b-4a8d-98af-9c94f99b3626', 'Pandas', 'advanced', 80.00, '#150458', @path2_id, DATE_SUB(NOW(), INTERVAL 30 DAY), DATE_SUB(NOW(), INTERVAL 2 DAY));

SELECT 'Sample AI Learning Paths data inserted successfully!' AS status;
SELECT CONCAT('Created 2 learning paths with 9 modules, 43 topics, and 8 skills for user 4313a2aa-ee2b-4a8d-98af-9c94f99b3626') AS info;
