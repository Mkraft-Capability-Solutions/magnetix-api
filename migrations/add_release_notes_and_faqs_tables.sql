CREATE TABLE IF NOT EXISTS release_notes (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  uuid CHAR(36) NOT NULL UNIQUE,
  version VARCHAR(20) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  release_date DATE NOT NULL,
  status ENUM('draft','published') NOT NULL DEFAULT 'draft',
  created_by CHAR(36) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  is_deleted TINYINT(1) NOT NULL DEFAULT 0,
  INDEX idx_release_notes_status (status),
  INDEX idx_release_notes_release_date (release_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS release_note_items (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  release_note_id INT UNSIGNED NOT NULL,
  type ENUM('feature','improvement','bugfix','breaking') NOT NULL DEFAULT 'feature',
  description TEXT NOT NULL,
  sort_order INT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (release_note_id) REFERENCES release_notes(id) ON DELETE CASCADE,
  INDEX idx_items_release_note_id (release_note_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS faqs (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  uuid CHAR(36) NOT NULL UNIQUE,
  question VARCHAR(500) NOT NULL,
  answer TEXT NOT NULL,
  category VARCHAR(100) NOT NULL DEFAULT 'General',
  sort_order INT UNSIGNED NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_by CHAR(36) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  is_deleted TINYINT(1) NOT NULL DEFAULT 0,
  INDEX idx_faqs_category (category),
  INDEX idx_faqs_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
