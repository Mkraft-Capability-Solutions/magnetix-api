-- Create unified notifications table for all notification types
CREATE TABLE IF NOT EXISTS notifications (
  id INT PRIMARY KEY AUTO_INCREMENT,
  uuid VARCHAR(36) UNIQUE NOT NULL DEFAULT (UUID()),

  -- Content
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  notification_type ENUM('marketing', 'system', 'announcement', 'instructor', 'event', 'course') NOT NULL,
  icon VARCHAR(50) DEFAULT 'bell',
  action_url VARCHAR(500),
  metadata JSON,

  -- Recipient
  recipient_id VARCHAR(36) NOT NULL,

  -- Delivery
  delivery_method ENUM('in-app', 'email', 'both') DEFAULT 'in-app',

  -- Status
  is_read TINYINT(1) DEFAULT 0,
  read_at DATETIME,

  -- Campaign tracking (nullable for non-marketing notifications)
  campaign_id INT,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  scheduled_for DATETIME,
  sent_at DATETIME,

  -- Soft delete
  is_deleted TINYINT(1) DEFAULT 0,
  deleted_at DATETIME,

  -- Indexes
  INDEX idx_recipient_read (recipient_id, is_read, is_deleted),
  INDEX idx_created (created_at),
  INDEX idx_campaign (campaign_id),
  INDEX idx_type_recipient (notification_type, recipient_id),

  FOREIGN KEY (recipient_id) REFERENCES users(uuid) ON DELETE CASCADE
);

-- Create marketing campaigns table
CREATE TABLE IF NOT EXISTS marketing_campaigns (
  id INT PRIMARY KEY AUTO_INCREMENT,
  uuid VARCHAR(36) UNIQUE NOT NULL DEFAULT (UUID()),

  -- Content
  title VARCHAR(255) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,

  -- Targeting
  target_audience JSON NOT NULL,
  recipient_count INT DEFAULT 0,

  -- Delivery
  delivery_method ENUM('in-app', 'email', 'both') NOT NULL DEFAULT 'both',

  -- Status
  status ENUM('draft', 'scheduled', 'sending', 'sent', 'failed') DEFAULT 'draft',

  -- Timestamps
  scheduled_for DATETIME,
  sent_at DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- Creator
  created_by VARCHAR(36) NOT NULL,

  -- Stats
  total_sent INT DEFAULT 0,
  total_delivered INT DEFAULT 0,
  total_failed INT DEFAULT 0,
  total_opened INT DEFAULT 0,
  total_clicked INT DEFAULT 0,

  -- Soft delete
  is_deleted TINYINT(1) DEFAULT 0,

  FOREIGN KEY (created_by) REFERENCES users(uuid),
  INDEX idx_status_created (status, created_at),
  INDEX idx_created_by (created_by)
);

-- Create email logs table
CREATE TABLE IF NOT EXISTS email_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,

  notification_id INT NOT NULL,
  campaign_id INT,

  recipient_email VARCHAR(255) NOT NULL,
  recipient_id VARCHAR(36),

  status ENUM('pending', 'sent', 'delivered', 'failed', 'bounced') DEFAULT 'pending',

  sent_at DATETIME,
  delivered_at DATETIME,
  opened_at DATETIME,
  clicked_at DATETIME,
  failed_at DATETIME,

  error_message TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (notification_id) REFERENCES notifications(id) ON DELETE CASCADE,
  FOREIGN KEY (campaign_id) REFERENCES marketing_campaigns(id) ON DELETE SET NULL,
  FOREIGN KEY (recipient_id) REFERENCES users(uuid) ON DELETE SET NULL,

  INDEX idx_notification (notification_id),
  INDEX idx_campaign (campaign_id),
  INDEX idx_status (status),
  INDEX idx_recipient (recipient_email)
);

SELECT 'Notification tables created successfully!' as status;
