-- ============================================================================
-- Featured Courses & Recommendation Rules Tables
-- ============================================================================

-- Table 1: Featured Courses
-- Stores courses that should be highlighted/featured in the catalog
CREATE TABLE IF NOT EXISTS featured_courses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  course_id INT NOT NULL,
  display_order INT DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  created_by VARCHAR(36),
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_updated_by VARCHAR(36),
  FOREIGN KEY (course_id) REFERENCES course(id) ON DELETE CASCADE,
  UNIQUE KEY unique_featured_course (course_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table 2: Recommendation Rules
-- Stores rules for recommending courses based on conditions
CREATE TABLE IF NOT EXISTS recommendation_rules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  rule_name VARCHAR(255) NOT NULL,
  rule_condition TEXT NOT NULL,
  status ENUM('Active', 'Inactive') DEFAULT 'Active',
  created_by VARCHAR(36),
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_updated_by VARCHAR(36),
  UNIQUE KEY unique_rule_name (rule_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table 3: Recommendation Rule Courses (Junction Table)
-- Links recommendation rules to the courses they recommend
CREATE TABLE IF NOT EXISTS recommendation_rule_courses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  rule_id INT NOT NULL,
  course_id INT NOT NULL,
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (rule_id) REFERENCES recommendation_rules(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES course(id) ON DELETE CASCADE,
  UNIQUE KEY unique_rule_course (rule_id, course_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Indexes for better query performance
CREATE INDEX idx_featured_courses_active ON featured_courses(is_active);
CREATE INDEX idx_featured_courses_order ON featured_courses(display_order);
CREATE INDEX idx_recommendation_rules_status ON recommendation_rules(status);
CREATE INDEX idx_rule_courses_rule ON recommendation_rule_courses(rule_id);
CREATE INDEX idx_rule_courses_course ON recommendation_rule_courses(course_id);

-- Sample data for testing (optional)
-- INSERT INTO recommendation_rules (rule_name, rule_condition, status, created_by)
-- VALUES
--   ('New Joiners Onboarding', 'user.tenure < 30', 'Active', 'system'),
--   ('Leadership Track', 'user.role IN (manager, senior_manager)', 'Active', 'system'),
--   ('Technical Upskilling', 'user.department = engineering', 'Inactive', 'system');
