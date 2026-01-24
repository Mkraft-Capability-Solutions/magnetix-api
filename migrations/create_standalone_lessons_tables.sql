-- Migration: Create standalone_lessons and standalone_ilts tables
-- Description: These tables store lessons that are not associated with any course
-- These lessons can be created independently and later associated with courses

-- ============================================================================
-- Create standalone_lessons table
-- ============================================================================
CREATE TABLE IF NOT EXISTS standalone_lessons (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  lesson_type ENUM('Content-Based', 'ILTS') NOT NULL DEFAULT 'Content-Based',

  -- Content-Based lesson fields
  lesson_content_type ENUM('document', 'scorm', 'mp4', 'url') DEFAULT NULL,
  lesson_content_document VARCHAR(500) DEFAULT NULL,
  lesson_content_scorm VARCHAR(500) DEFAULT NULL,
  lesson_content_mp4 VARCHAR(500) DEFAULT NULL,
  lesson_content_url VARCHAR(500) DEFAULT NULL,
  lesson_duration VARCHAR(50) DEFAULT NULL,
  description TEXT DEFAULT NULL,

  -- Metadata
  creator_id VARCHAR(36) NOT NULL,
  last_updated_by VARCHAR(36) NOT NULL,
  created_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_updated DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- Indexes
  INDEX idx_creator (creator_id),
  INDEX idx_lesson_type (lesson_type),
  INDEX idx_created_date (created_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- Create standalone_ilts table
-- ============================================================================
CREATE TABLE IF NOT EXISTS standalone_ilts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  lesson_id INT NOT NULL,
  lesson_mode ENUM('Online', 'Offline') NOT NULL DEFAULT 'Online',
  meet_url VARCHAR(500) DEFAULT NULL,
  venue VARCHAR(500) DEFAULT NULL,
  start_date DATE DEFAULT NULL,
  start_time TIME DEFAULT NULL,
  end_date DATE DEFAULT NULL,
  end_time TIME DEFAULT NULL,
  creator_id VARCHAR(36) NOT NULL,
  last_updated_by VARCHAR(36) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_updated DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- Foreign key constraint
  FOREIGN KEY (lesson_id) REFERENCES standalone_lessons(id) ON DELETE CASCADE,

  -- Indexes
  INDEX idx_lesson_id (lesson_id),
  INDEX idx_start_date (start_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- Comments for documentation
-- ============================================================================
-- standalone_lessons: Stores lessons that are created independently without course association
-- standalone_ilts: Stores ILTS session details for standalone ILTS lessons
