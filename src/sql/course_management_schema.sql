-- =============================================
-- Course Management Database Schema and Procedures
-- This file contains all tables and stored procedures for course management
-- =============================================

-- =============================================
-- TABLE DEFINITIONS
-- =============================================

-- Course Categories
CREATE TABLE IF NOT EXISTS course_category (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  creator_id VARCHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  is_deleted TINYINT(1) DEFAULT 0,
  INDEX idx_name (name),
  INDEX idx_creator (creator_id),
  UNIQUE KEY unique_category_name (name, is_deleted)
);

-- Course Subcategories
CREATE TABLE IF NOT EXISTS course_subcategory (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  category_id INT NOT NULL,
  description TEXT,
  creator_id VARCHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  is_deleted TINYINT(1) DEFAULT 0,
  FOREIGN KEY (category_id) REFERENCES course_category(id),
  INDEX idx_category (category_id),
  INDEX idx_name (name),
  INDEX idx_creator (creator_id),
  UNIQUE KEY unique_subcategory_name (name, category_id, is_deleted)
);

-- Languages
CREATE TABLE IF NOT EXISTS language (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL UNIQUE,
  code VARCHAR(10) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_deleted TINYINT(1) DEFAULT 0
);

-- Main Course Table
CREATE TABLE IF NOT EXISTS course (
  id INT PRIMARY KEY AUTO_INCREMENT,
  creator_id VARCHAR(36) NOT NULL,
  title VARCHAR(500) NOT NULL,
  instructor VARCHAR(255),
  short_description TEXT,
  description TEXT,
  language_id INT NOT NULL,
  category_id INT NOT NULL,
  sub_category_id INT NOT NULL,
  level ENUM('beginner', 'intermediate', 'advanced') NOT NULL DEFAULT 'beginner',
  course_duration VARCHAR(100),
  thumbnail VARCHAR(500),
  media_type VARCHAR(50),
  media_url VARCHAR(500),
  meta_keywords TEXT,
  meta_description TEXT,
  status ENUM('draft', 'pending', 'published', 'archived') DEFAULT 'draft',
  published_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  is_deleted TINYINT(1) DEFAULT 0,
  FOREIGN KEY (creator_id) REFERENCES users(uuid),
  FOREIGN KEY (language_id) REFERENCES language(id),
  FOREIGN KEY (category_id) REFERENCES course_category(id),
  FOREIGN KEY (sub_category_id) REFERENCES course_subcategory(id),
  INDEX idx_creator (creator_id),
  INDEX idx_status (status),
  INDEX idx_category (category_id),
  INDEX idx_subcategory (sub_category_id),
  INDEX idx_level (level),
  INDEX idx_created (created_at)
);

-- Course Sections
CREATE TABLE IF NOT EXISTS course_section (
  id INT PRIMARY KEY AUTO_INCREMENT,
  course_id INT NOT NULL,
  title VARCHAR(500) NOT NULL,
  section_order INT DEFAULT 0,
  creator_id VARCHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  is_deleted TINYINT(1) DEFAULT 0,
  FOREIGN KEY (course_id) REFERENCES course(id) ON DELETE CASCADE,
  INDEX idx_course (course_id),
  INDEX idx_order (section_order)
);

-- Course Lessons
CREATE TABLE IF NOT EXISTS course_lesson (
  id INT PRIMARY KEY AUTO_INCREMENT,
  course_id INT NOT NULL,
  section_id INT NOT NULL,
  title VARCHAR(500) NOT NULL,
  lesson_type ENUM('ILTS', 'Content-Based') NOT NULL DEFAULT 'Content-Based',
  lesson_order INT DEFAULT 0,

  -- Content-Based fields
  content_type ENUM('document', 'scorm', 'mp4', 'url') NULL,
  lesson_content_document VARCHAR(500),
  scorm_package VARCHAR(500),
  video_upload VARCHAR(500),
  content_url VARCHAR(1000),
  lesson_duration VARCHAR(100),
  description TEXT,
  skills TEXT, -- JSON array of skills

  -- ILTS fields
  ilts_type ENUM('Online', 'Offline') NULL,
  ilts_url VARCHAR(1000),
  start_date DATE,
  start_time TIME,
  end_date DATE,
  end_time TIME,
  event_venue VARCHAR(500),
  meet_url VARCHAR(1000),

  creator_id VARCHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  is_deleted TINYINT(1) DEFAULT 0,

  FOREIGN KEY (course_id) REFERENCES course(id) ON DELETE CASCADE,
  FOREIGN KEY (section_id) REFERENCES course_section(id) ON DELETE CASCADE,
  INDEX idx_course (course_id),
  INDEX idx_section (section_id),
  INDEX idx_type (lesson_type),
  INDEX idx_order (lesson_order)
);

-- Course Outcomes (Learning Objectives)
CREATE TABLE IF NOT EXISTS course_outcome (
  id INT PRIMARY KEY AUTO_INCREMENT,
  course_id INT NOT NULL,
  outcome_text TEXT NOT NULL,
  outcome_order INT DEFAULT 0,
  creator_id VARCHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  is_deleted TINYINT(1) DEFAULT 0,
  FOREIGN KEY (course_id) REFERENCES course(id) ON DELETE CASCADE,
  INDEX idx_course (course_id)
);

-- Course Requirements (Prerequisites)
CREATE TABLE IF NOT EXISTS course_requirement (
  id INT PRIMARY KEY AUTO_INCREMENT,
  course_id INT NOT NULL,
  requirement_text TEXT NOT NULL,
  requirement_order INT DEFAULT 0,
  creator_id VARCHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  is_deleted TINYINT(1) DEFAULT 0,
  FOREIGN KEY (course_id) REFERENCES course(id) ON DELETE CASCADE,
  INDEX idx_course (course_id)
);

-- Course FAQs
CREATE TABLE IF NOT EXISTS course_faq (
  id INT PRIMARY KEY AUTO_INCREMENT,
  course_id INT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  faq_order INT DEFAULT 0,
  creator_id VARCHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  is_deleted TINYINT(1) DEFAULT 0,
  FOREIGN KEY (course_id) REFERENCES course(id) ON DELETE CASCADE,
  INDEX idx_course (course_id)
);

-- Course Enrollments
CREATE TABLE IF NOT EXISTS enrol (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id VARCHAR(36) NOT NULL,
  course_id INT NOT NULL,
  enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  progress INT DEFAULT 0,
  status ENUM('enrolled', 'in_progress', 'completed', 'dropped') DEFAULT 'enrolled',
  completed_at TIMESTAMP NULL,
  certificate_issued TINYINT(1) DEFAULT 0,
  is_deleted TINYINT(1) DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(uuid),
  FOREIGN KEY (course_id) REFERENCES course(id) ON DELETE CASCADE,
  UNIQUE KEY unique_enrollment (user_id, course_id),
  INDEX idx_user (user_id),
  INDEX idx_course (course_id),
  INDEX idx_status (status)
);

-- Saved Courses (Bookmarks)
CREATE TABLE IF NOT EXISTS saved_courses (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id VARCHAR(36) NOT NULL,
  course_id INT NOT NULL,
  saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_deleted TINYINT(1) DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(uuid),
  FOREIGN KEY (course_id) REFERENCES course(id) ON DELETE CASCADE,
  UNIQUE KEY unique_saved_course (user_id, course_id),
  INDEX idx_user (user_id),
  INDEX idx_course (course_id)
);

-- Lesson Progress Tracking
CREATE TABLE IF NOT EXISTS lesson_progress (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id VARCHAR(36) NOT NULL,
  course_id INT NOT NULL,
  lesson_id INT NOT NULL,
  progress INT DEFAULT 0,
  completed TINYINT(1) DEFAULT 0,
  completed_at TIMESTAMP NULL,
  last_accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  is_deleted TINYINT(1) DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(uuid),
  FOREIGN KEY (course_id) REFERENCES course(id) ON DELETE CASCADE,
  FOREIGN KEY (lesson_id) REFERENCES course_lesson(id) ON DELETE CASCADE,
  UNIQUE KEY unique_lesson_progress (user_id, lesson_id),
  INDEX idx_user (user_id),
  INDEX idx_course (course_id),
  INDEX idx_lesson (lesson_id)
);

-- =============================================
-- INITIAL DATA INSERTS
-- =============================================

-- Insert default languages if not exists
INSERT IGNORE INTO language (name, code) VALUES
('English', 'en'),
('Spanish', 'es'),
('French', 'fr'),
('German', 'de'),
('Hindi', 'hi'),
('Mandarin', 'zh');

-- Insert default categories if not exists
INSERT IGNORE INTO course_category (name, description) VALUES
('Technology', 'Technology and IT related courses'),
('Business', 'Business and management courses'),
('Design', 'Design and creative courses'),
('Marketing', 'Marketing and sales courses'),
('Development', 'Software development courses'),
('Data Science', 'Data science and analytics courses');

-- Insert default subcategories if not exists
-- Get category IDs dynamically and insert subcategories
INSERT IGNORE INTO course_subcategory (name, category_id, description)
SELECT 'Web Development', id, 'Web development and frontend technologies'
FROM course_category WHERE name = 'Technology' LIMIT 1;

INSERT IGNORE INTO course_subcategory (name, category_id, description)
SELECT 'Cloud Computing', id, 'Cloud platforms and services'
FROM course_category WHERE name = 'Technology' LIMIT 1;

INSERT IGNORE INTO course_subcategory (name, category_id, description)
SELECT 'Cybersecurity', id, 'Security and privacy courses'
FROM course_category WHERE name = 'Technology' LIMIT 1;

INSERT IGNORE INTO course_subcategory (name, category_id, description)
SELECT 'Leadership', id, 'Leadership and team management'
FROM course_category WHERE name = 'Business' LIMIT 1;

INSERT IGNORE INTO course_subcategory (name, category_id, description)
SELECT 'Project Management', id, 'Project planning and execution'
FROM course_category WHERE name = 'Business' LIMIT 1;

INSERT IGNORE INTO course_subcategory (name, category_id, description)
SELECT 'UI/UX Design', id, 'User interface and experience design'
FROM course_category WHERE name = 'Design' LIMIT 1;

INSERT IGNORE INTO course_subcategory (name, category_id, description)
SELECT 'Graphic Design', id, 'Visual design and graphics'
FROM course_category WHERE name = 'Design' LIMIT 1;

INSERT IGNORE INTO course_subcategory (name, category_id, description)
SELECT 'Digital Marketing', id, 'Online marketing strategies'
FROM course_category WHERE name = 'Marketing' LIMIT 1;

INSERT IGNORE INTO course_subcategory (name, category_id, description)
SELECT 'Content Marketing', id, 'Content creation and strategy'
FROM course_category WHERE name = 'Marketing' LIMIT 1;

INSERT IGNORE INTO course_subcategory (name, category_id, description)
SELECT 'Full Stack Development', id, 'Frontend and backend development'
FROM course_category WHERE name = 'Development' LIMIT 1;

INSERT IGNORE INTO course_subcategory (name, category_id, description)
SELECT 'Mobile App Development', id, 'iOS and Android development'
FROM course_category WHERE name = 'Development' LIMIT 1;

INSERT IGNORE INTO course_subcategory (name, category_id, description)
SELECT 'Machine Learning', id, 'ML algorithms and models'
FROM course_category WHERE name = 'Data Science' LIMIT 1;

INSERT IGNORE INTO course_subcategory (name, category_id, description)
SELECT 'Data Analytics', id, 'Data analysis and visualization'
FROM course_category WHERE name = 'Data Science' LIMIT 1;

-- =============================================
-- DROP EXISTING STORED PROCEDURES
-- =============================================
DROP PROCEDURE IF EXISTS add_instructor_course;
DROP PROCEDURE IF EXISTS update_instructor_course;
DROP PROCEDURE IF EXISTS delete_instructor_course;
DROP PROCEDURE IF EXISTS get_course_details_by_id;
DROP PROCEDURE IF EXISTS add_course_section;
DROP PROCEDURE IF EXISTS add_course_lesson;
DROP PROCEDURE IF EXISTS add_course_outcome;
DROP PROCEDURE IF EXISTS add_course_requirement;
DROP PROCEDURE IF EXISTS add_course_faq;
DROP PROCEDURE IF EXISTS delete_course_outcomes;
DROP PROCEDURE IF EXISTS delete_course_requirements;
DROP PROCEDURE IF EXISTS delete_course_faqs;
DROP PROCEDURE IF EXISTS get_student_subscribed_courses;
DROP PROCEDURE IF EXISTS get_explore_courses;
DROP PROCEDURE IF EXISTS get_saved_courses;
DROP PROCEDURE IF EXISTS save_course;
DROP PROCEDURE IF EXISTS unsave_course;
DROP PROCEDURE IF EXISTS enroll_student_in_course;
DROP PROCEDURE IF EXISTS check_course_enrollment;
DROP PROCEDURE IF EXISTS get_course_enrolled_details;
DROP PROCEDURE IF EXISTS get_course_basic_details;
DROP PROCEDURE IF EXISTS get_all_categories;
DROP PROCEDURE IF EXISTS get_all_subcategories;
DROP PROCEDURE IF EXISTS get_all_languages;

DELIMITER //

-- =============================================
-- Add Instructor Course
-- =============================================
CREATE PROCEDURE add_instructor_course(
  IN p_creator_id VARCHAR(36),
  IN p_title VARCHAR(500),
  IN p_instructor VARCHAR(255),
  IN p_short_description TEXT,
  IN p_description TEXT,
  IN p_language_id INT,
  IN p_category_id INT,
  IN p_sub_category_id INT,
  IN p_level VARCHAR(50),
  IN p_course_duration VARCHAR(100),
  IN p_thumbnail VARCHAR(500),
  IN p_media_type VARCHAR(50),
  IN p_media_url VARCHAR(500),
  IN p_meta_keywords TEXT
)
BEGIN
  DECLARE v_course_id INT;

  INSERT INTO course (
    creator_id, title, instructor, short_description, description,
    language_id, category_id, sub_category_id, level, course_duration,
    thumbnail, media_type, media_url, meta_keywords, status
  ) VALUES (
    p_creator_id, p_title, p_instructor, p_short_description, p_description,
    p_language_id, p_category_id, p_sub_category_id, p_level, p_course_duration,
    p_thumbnail, p_media_type, p_media_url, p_meta_keywords, 'draft'
  );

  SET v_course_id = LAST_INSERT_ID();

  SELECT v_course_id as courseId, 'Course created successfully' as message;
END //

-- =============================================
-- Update Instructor Course
-- =============================================
CREATE PROCEDURE update_instructor_course(
  IN p_course_id INT,
  IN p_creator_id VARCHAR(36),
  IN p_title VARCHAR(500),
  IN p_instructor VARCHAR(255),
  IN p_short_description TEXT,
  IN p_description TEXT,
  IN p_language_id INT,
  IN p_category_id INT,
  IN p_sub_category_id INT,
  IN p_level VARCHAR(50),
  IN p_course_duration VARCHAR(100),
  IN p_thumbnail VARCHAR(500),
  IN p_media_type VARCHAR(50),
  IN p_media_url VARCHAR(500),
  IN p_meta_keywords TEXT
)
BEGIN
  -- Verify ownership
  IF NOT EXISTS (SELECT 1 FROM course WHERE id = p_course_id AND creator_id = p_creator_id AND is_deleted = 0) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Course not found or unauthorized';
  END IF;

  UPDATE course SET
    title = COALESCE(p_title, title),
    instructor = COALESCE(p_instructor, instructor),
    short_description = COALESCE(p_short_description, short_description),
    description = COALESCE(p_description, description),
    language_id = COALESCE(p_language_id, language_id),
    category_id = COALESCE(p_category_id, category_id),
    sub_category_id = COALESCE(p_sub_category_id, sub_category_id),
    level = COALESCE(p_level, level),
    course_duration = COALESCE(p_course_duration, course_duration),
    thumbnail = COALESCE(p_thumbnail, thumbnail),
    media_type = COALESCE(p_media_type, media_type),
    media_url = COALESCE(p_media_url, media_url),
    meta_keywords = COALESCE(p_meta_keywords, meta_keywords),
    updated_at = NOW()
  WHERE id = p_course_id AND creator_id = p_creator_id;

  SELECT 'Course updated successfully' as message;
END //

-- =============================================
-- Delete Instructor Course
-- =============================================
CREATE PROCEDURE delete_instructor_course(
  IN p_course_id INT,
  IN p_creator_id VARCHAR(36)
)
BEGIN
  -- Verify ownership
  IF NOT EXISTS (SELECT 1 FROM course WHERE id = p_course_id AND creator_id = p_creator_id AND is_deleted = 0) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Course not found or unauthorized';
  END IF;

  -- Soft delete
  UPDATE course SET is_deleted = 1, updated_at = NOW() WHERE id = p_course_id;

  SELECT 'Course deleted successfully' as message;
END //

-- =============================================
-- Get Course Details by ID
-- =============================================
CREATE PROCEDURE get_course_details_by_id(
  IN p_course_id INT,
  IN p_creator_id VARCHAR(36)
)
BEGIN
  -- Get basic course info
  SELECT
    c.id,
    c.creator_id,
    c.title,
    c.instructor,
    c.short_description as shortDescription,
    c.description,
    c.language_id as languageId,
    l.name as languageName,
    c.category_id as categoryId,
    cat.name as categoryName,
    c.sub_category_id as subCategoryId,
    sub.name as subCategoryName,
    c.level,
    c.course_duration as courseDuration,
    c.thumbnail,
    c.media_type as mediaType,
    c.media_url as mediaUrl,
    c.meta_keywords as metaKeywords,
    c.meta_description as metaDescription,
    c.status,
    c.created_at as createdAt,
    c.updated_at as updatedAt,
    (SELECT COUNT(*) FROM enrol WHERE course_id = c.id AND is_deleted = 0) as enrollmentCount,
    (SELECT COUNT(*) FROM course_lesson WHERE course_id = c.id AND is_deleted = 0) as lessonCount
  FROM course c
  LEFT JOIN language l ON c.language_id = l.id
  LEFT JOIN course_category cat ON c.category_id = cat.id
  LEFT JOIN course_subcategory sub ON c.sub_category_id = sub.id
  WHERE c.id = p_course_id AND c.is_deleted = 0;

  -- Get sections with lessons
  SELECT
    s.id,
    s.title,
    s.section_order as sectionOrder
  FROM course_section s
  WHERE s.course_id = p_course_id AND s.is_deleted = 0
  ORDER BY s.section_order, s.id;

  -- Get lessons
  SELECT
    l.id,
    l.section_id as sectionId,
    l.title,
    l.lesson_type as lessonType,
    l.lesson_order as lessonOrder,
    l.content_type as contentType,
    l.lesson_content_document as lessonContentDocument,
    l.scorm_package as scormPackage,
    l.video_upload as videoUpload,
    l.content_url as contentUrl,
    l.lesson_duration as lessonDuration,
    l.description,
    l.skills,
    l.ilts_type as iltsType,
    l.ilts_url as iltsUrl,
    l.start_date as startDate,
    l.start_time as startTime,
    l.end_date as endDate,
    l.end_time as endTime,
    l.event_venue as eventVenue,
    l.meet_url as meetUrl
  FROM course_lesson l
  WHERE l.course_id = p_course_id AND l.is_deleted = 0
  ORDER BY l.section_id, l.lesson_order, l.id;

  -- Get outcomes
  SELECT
    o.id,
    o.outcome_text as outcomeText,
    o.outcome_order as outcomeOrder
  FROM course_outcome o
  WHERE o.course_id = p_course_id AND o.is_deleted = 0
  ORDER BY o.outcome_order, o.id;

  -- Get requirements
  SELECT
    r.id,
    r.requirement_text as requirementText,
    r.requirement_order as requirementOrder
  FROM course_requirement r
  WHERE r.course_id = p_course_id AND r.is_deleted = 0
  ORDER BY r.requirement_order, r.id;

  -- Get FAQs
  SELECT
    f.id,
    f.question,
    f.answer,
    f.faq_order as faqOrder
  FROM course_faq f
  WHERE f.course_id = p_course_id AND f.is_deleted = 0
  ORDER BY f.faq_order, f.id;
END //

-- =============================================
-- Add Course Section
-- =============================================
CREATE PROCEDURE add_course_section(
  IN p_course_id INT,
  IN p_title VARCHAR(500),
  IN p_creator_id VARCHAR(36),
  IN p_section_order INT
)
BEGIN
  DECLARE v_section_id INT;

  INSERT INTO course_section (course_id, title, creator_id, section_order)
  VALUES (p_course_id, p_title, p_creator_id, COALESCE(p_section_order, 0));

  SET v_section_id = LAST_INSERT_ID();

  SELECT v_section_id as sectionId, 'Section created successfully' as message;
END //

-- =============================================
-- Add Course Lesson
-- =============================================
CREATE PROCEDURE add_course_lesson(
  IN p_course_id INT,
  IN p_section_id INT,
  IN p_title VARCHAR(500),
  IN p_lesson_type VARCHAR(50),
  IN p_content_type VARCHAR(50),
  IN p_lesson_content_document VARCHAR(500),
  IN p_scorm_package VARCHAR(500),
  IN p_video_upload VARCHAR(500),
  IN p_content_url VARCHAR(1000),
  IN p_lesson_duration VARCHAR(100),
  IN p_description TEXT,
  IN p_skills TEXT,
  IN p_creator_id VARCHAR(36)
)
BEGIN
  DECLARE v_lesson_id INT;

  INSERT INTO course_lesson (
    course_id, section_id, title, lesson_type, content_type,
    lesson_content_document, scorm_package, video_upload, content_url,
    lesson_duration, description, skills, creator_id
  ) VALUES (
    p_course_id, p_section_id, p_title, p_lesson_type, p_content_type,
    p_lesson_content_document, p_scorm_package, p_video_upload, p_content_url,
    p_lesson_duration, p_description, p_skills, p_creator_id
  );

  SET v_lesson_id = LAST_INSERT_ID();

  SELECT v_lesson_id as lessonId, 'Lesson created successfully' as message;
END //

-- =============================================
-- Add Course Outcome
-- =============================================
CREATE PROCEDURE add_course_outcome(
  IN p_course_id INT,
  IN p_outcome_text TEXT,
  IN p_creator_id VARCHAR(36),
  IN p_outcome_order INT
)
BEGIN
  INSERT INTO course_outcome (course_id, outcome_text, creator_id, outcome_order)
  VALUES (p_course_id, p_outcome_text, p_creator_id, COALESCE(p_outcome_order, 0));

  SELECT 'Outcome added successfully' as message;
END //

-- =============================================
-- Add Course Requirement
-- =============================================
CREATE PROCEDURE add_course_requirement(
  IN p_course_id INT,
  IN p_requirement_text TEXT,
  IN p_creator_id VARCHAR(36),
  IN p_requirement_order INT
)
BEGIN
  INSERT INTO course_requirement (course_id, requirement_text, creator_id, requirement_order)
  VALUES (p_course_id, p_requirement_text, p_creator_id, COALESCE(p_requirement_order, 0));

  SELECT 'Requirement added successfully' as message;
END //

-- =============================================
-- Add Course FAQ
-- =============================================
CREATE PROCEDURE add_course_faq(
  IN p_course_id INT,
  IN p_question TEXT,
  IN p_answer TEXT,
  IN p_creator_id VARCHAR(36),
  IN p_faq_order INT
)
BEGIN
  INSERT INTO course_faq (course_id, question, answer, creator_id, faq_order)
  VALUES (p_course_id, p_question, p_answer, p_creator_id, COALESCE(p_faq_order, 0));

  SELECT 'FAQ added successfully' as message;
END //

-- =============================================
-- Delete Course Outcomes
-- =============================================
CREATE PROCEDURE delete_course_outcomes(
  IN p_course_id INT
)
BEGIN
  UPDATE course_outcome SET is_deleted = 1 WHERE course_id = p_course_id;
  SELECT 'Outcomes deleted successfully' as message;
END //

-- =============================================
-- Delete Course Requirements
-- =============================================
CREATE PROCEDURE delete_course_requirements(
  IN p_course_id INT
)
BEGIN
  UPDATE course_requirement SET is_deleted = 1 WHERE course_id = p_course_id;
  SELECT 'Requirements deleted successfully' as message;
END //

-- =============================================
-- Delete Course FAQs
-- =============================================
CREATE PROCEDURE delete_course_faqs(
  IN p_course_id INT
)
BEGIN
  UPDATE course_faq SET is_deleted = 1 WHERE course_id = p_course_id;
  SELECT 'FAQs deleted successfully' as message;
END //

-- =============================================
-- Get Student Subscribed Courses (Enrolled)
-- =============================================
CREATE PROCEDURE get_student_subscribed_courses(
  IN p_user_id VARCHAR(36)
)
BEGIN
  SELECT
    c.id,
    c.title,
    c.short_description as shortDescription,
    c.thumbnail,
    c.level,
    c.course_duration as duration,
    cat.name as category,
    e.progress,
    e.status,
    e.enrolled_at as enrolledAt,
    (SELECT COUNT(*) FROM course_lesson WHERE course_id = c.id AND is_deleted = 0) as totalLessons,
    (SELECT COUNT(*) FROM lesson_progress WHERE course_id = c.id AND user_id = p_user_id AND completed = 1) as completedLessons
  FROM enrol e
  INNER JOIN course c ON e.course_id = c.id
  LEFT JOIN course_category cat ON c.category_id = cat.id
  WHERE e.user_id = p_user_id AND e.is_deleted = 0 AND c.is_deleted = 0
  ORDER BY e.enrolled_at DESC;
END //

-- =============================================
-- Get Explore Courses (Not Enrolled)
-- =============================================
CREATE PROCEDURE get_explore_courses(
  IN p_user_id VARCHAR(36)
)
BEGIN
  SELECT
    c.id,
    c.title,
    c.short_description as shortDescription,
    c.thumbnail,
    c.level,
    c.course_duration as duration,
    cat.name as category,
    c.created_at as publishedDate,
    (SELECT COUNT(*) FROM enrol WHERE course_id = c.id AND is_deleted = 0) as enrollmentCount,
    (SELECT COUNT(*) FROM course_lesson WHERE course_id = c.id AND is_deleted = 0) as lessonCount,
    EXISTS(SELECT 1 FROM saved_courses WHERE user_id = p_user_id AND course_id = c.id AND is_deleted = 0) as isSaved
  FROM course c
  LEFT JOIN course_category cat ON c.category_id = cat.id
  WHERE c.status = 'published'
    AND c.is_deleted = 0
    AND NOT EXISTS (SELECT 1 FROM enrol WHERE user_id = p_user_id AND course_id = c.id AND is_deleted = 0)
  ORDER BY c.created_at DESC;
END //

-- =============================================
-- Get Saved Courses
-- =============================================
CREATE PROCEDURE get_saved_courses(
  IN p_user_id VARCHAR(36)
)
BEGIN
  SELECT
    c.id,
    c.title,
    c.short_description as shortDescription,
    c.thumbnail,
    c.level,
    c.course_duration as duration,
    cat.name as category,
    sc.saved_at as savedAt,
    (SELECT COUNT(*) FROM enrol WHERE course_id = c.id AND is_deleted = 0) as enrollmentCount,
    (SELECT COUNT(*) FROM course_lesson WHERE course_id = c.id AND is_deleted = 0) as lessonCount,
    EXISTS(SELECT 1 FROM enrol WHERE user_id = p_user_id AND course_id = c.id AND is_deleted = 0) as isEnrolled
  FROM saved_courses sc
  INNER JOIN course c ON sc.course_id = c.id
  LEFT JOIN course_category cat ON c.category_id = cat.id
  WHERE sc.user_id = p_user_id AND sc.is_deleted = 0 AND c.is_deleted = 0
  ORDER BY sc.saved_at DESC;
END //

-- =============================================
-- Save Course (Bookmark)
-- =============================================
CREATE PROCEDURE save_course(
  IN p_user_id VARCHAR(36),
  IN p_course_id INT
)
BEGIN
  -- Check if already saved
  IF EXISTS (SELECT 1 FROM saved_courses WHERE user_id = p_user_id AND course_id = p_course_id AND is_deleted = 0) THEN
    SELECT 'Course is already saved' as message;
  ELSE
    -- Check if was previously deleted and restore, or insert new
    INSERT INTO saved_courses (user_id, course_id, is_deleted)
    VALUES (p_user_id, p_course_id, 0)
    ON DUPLICATE KEY UPDATE is_deleted = 0, saved_at = NOW();

    SELECT 'Course saved successfully' as message;
  END IF;
END //

-- =============================================
-- Unsave Course (Remove Bookmark)
-- =============================================
CREATE PROCEDURE unsave_course(
  IN p_user_id VARCHAR(36),
  IN p_course_id INT
)
BEGIN
  UPDATE saved_courses
  SET is_deleted = 1
  WHERE user_id = p_user_id AND course_id = p_course_id;

  SELECT 'Course unsaved successfully' as message;
END //

-- =============================================
-- Enroll Student in Course
-- =============================================
CREATE PROCEDURE enroll_student_in_course(
  IN p_user_id VARCHAR(36),
  IN p_course_id INT
)
BEGIN
  -- Check if already enrolled
  IF EXISTS (SELECT 1 FROM enrol WHERE user_id = p_user_id AND course_id = p_course_id AND is_deleted = 0) THEN
    SELECT 'Already enrolled in this course' as message;
  ELSE
    -- Insert or restore enrollment
    INSERT INTO enrol (user_id, course_id, status, is_deleted)
    VALUES (p_user_id, p_course_id, 'enrolled', 0)
    ON DUPLICATE KEY UPDATE is_deleted = 0, enrolled_at = NOW(), status = 'enrolled';

    SELECT 'Successfully enrolled in course' as message;
  END IF;
END //

-- =============================================
-- Check Course Enrollment
-- =============================================
CREATE PROCEDURE check_course_enrollment(
  IN p_user_id VARCHAR(36),
  IN p_course_id INT
)
BEGIN
  SELECT
    CASE WHEN COUNT(*) > 0 THEN 1 ELSE 0 END as isEnrolled
  FROM enrol
  WHERE user_id = p_user_id AND course_id = p_course_id AND is_deleted = 0;
END //

-- =============================================
-- Get Course Enrolled Details (For Learning)
-- =============================================
CREATE PROCEDURE get_course_enrolled_details(
  IN p_user_id VARCHAR(36),
  IN p_course_id INT
)
BEGIN
  -- Get course and enrollment info
  SELECT
    c.id,
    c.title,
    c.description,
    c.thumbnail,
    c.level,
    cat.name as category,
    e.progress,
    e.status as enrollmentStatus,
    e.enrolled_at as enrolledAt,
    (SELECT COUNT(*) FROM course_lesson WHERE course_id = c.id AND is_deleted = 0) as totalLessons,
    (SELECT COUNT(*) FROM lesson_progress WHERE course_id = c.id AND user_id = p_user_id AND completed = 1) as completedLessons
  FROM course c
  INNER JOIN enrol e ON c.id = e.course_id
  LEFT JOIN course_category cat ON c.category_id = cat.id
  WHERE c.id = p_course_id AND e.user_id = p_user_id AND e.is_deleted = 0 AND c.is_deleted = 0;

  -- Get lessons with progress
  SELECT
    l.id,
    l.title,
    l.section_id as sectionId,
    l.lesson_type as lessonType,
    l.content_type as contentType,
    l.video_upload as videoUrl,
    l.scorm_package as scormUrl,
    l.lesson_content_document as documentUrl,
    l.content_url as externalUrl,
    l.lesson_duration as duration,
    COALESCE(lp.progress, 0) as progress,
    COALESCE(lp.completed, 0) as completed
  FROM course_lesson l
  LEFT JOIN lesson_progress lp ON l.id = lp.lesson_id AND lp.user_id = p_user_id
  WHERE l.course_id = p_course_id AND l.is_deleted = 0
  ORDER BY l.section_id, l.lesson_order;
END //

-- =============================================
-- Get Course Basic Details (Public View)
-- =============================================
CREATE PROCEDURE get_course_basic_details(
  IN p_course_id INT
)
BEGIN
  SELECT
    c.id,
    c.title,
    c.short_description as shortDescription,
    c.description,
    c.thumbnail,
    c.level,
    c.course_duration as duration,
    cat.name as category,
    sub.name as subcategory,
    l.name as language,
    (SELECT COUNT(*) FROM enrol WHERE course_id = c.id AND is_deleted = 0) as enrollmentCount,
    (SELECT COUNT(*) FROM course_lesson WHERE course_id = c.id AND is_deleted = 0) as lessonCount,
    c.created_at as publishedDate
  FROM course c
  LEFT JOIN course_category cat ON c.category_id = cat.id
  LEFT JOIN course_subcategory sub ON c.sub_category_id = sub.id
  LEFT JOIN language l ON c.language_id = l.id
  WHERE c.id = p_course_id AND c.is_deleted = 0;

  -- Get outcomes
  SELECT outcome_text as text
  FROM course_outcome
  WHERE course_id = p_course_id AND is_deleted = 0
  ORDER BY outcome_order;

  -- Get requirements
  SELECT requirement_text as text
  FROM course_requirement
  WHERE course_id = p_course_id AND is_deleted = 0
  ORDER BY requirement_order;
END //

-- =============================================
-- Get All Categories
-- =============================================
CREATE PROCEDURE get_all_categories()
BEGIN
  SELECT
    id,
    name,
    description,
    created_at as createdAt,
    updated_at as updatedAt
  FROM course_category
  WHERE is_deleted = 0
  ORDER BY name ASC;
END //

-- =============================================
-- Get All Subcategories
-- =============================================
CREATE PROCEDURE get_all_subcategories()
BEGIN
  SELECT
    id,
    name,
    category_id as categoryId,
    description,
    created_at as createdAt,
    updated_at as updatedAt
  FROM course_subcategory
  WHERE is_deleted = 0
  ORDER BY category_id, name ASC;
END //

-- =============================================
-- Get All Languages
-- =============================================
CREATE PROCEDURE get_all_languages()
BEGIN
  SELECT
    id,
    name,
    code,
    created_at as createdAt
  FROM language
  WHERE is_deleted = 0
  ORDER BY name ASC;
END //

DELIMITER ;

-- =============================================
-- VERIFICATION
-- =============================================
SELECT 'Course management schema and procedures created successfully' as message;
