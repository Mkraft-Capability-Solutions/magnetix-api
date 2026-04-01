CREATE TABLE IF NOT EXISTS api_keys (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  uuid CHAR(36) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  key_prefix VARCHAR(12) NOT NULL,
  key_hash VARCHAR(255) NOT NULL,
  allowed_routes JSON NOT NULL,
  status ENUM('active', 'revoked') NOT NULL DEFAULT 'active',
  expires_at DATETIME NULL,
  last_used_at DATETIME NULL,
  created_by CHAR(36) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  is_deleted TINYINT(1) NOT NULL DEFAULT 0,
  INDEX idx_api_keys_key_prefix (key_prefix),
  INDEX idx_api_keys_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
