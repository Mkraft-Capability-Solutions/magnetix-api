-- =============================================
-- Organization Management Migration
-- Created: 2026-04-23
-- Purpose: Add organization management with user assignments
-- =============================================

-- 1. Create organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL UNIQUE,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_name (name),
  INDEX idx_active (is_active)
);

-- 2. Create user_organizations junction table
CREATE TABLE IF NOT EXISTS user_organizations (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id VARCHAR(36) NOT NULL,
  organization_id INT NOT NULL,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user_org (user_id, organization_id),
  INDEX idx_user (user_id),
  INDEX idx_org (organization_id),
  FOREIGN KEY (user_id) REFERENCES users(uuid) ON DELETE CASCADE,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- 3. Insert some sample organizations for testing
INSERT INTO organizations (name, is_active) VALUES
  ('Milekraft Technologies', 1),
  ('ISMS Connect', 1),
  ('Cotiviti', 1)
ON DUPLICATE KEY UPDATE name = name;

SELECT 'Organizations tables created successfully' AS status;
