-- Learning Item Instances
-- Allows admins to assign courses or quizzes to batches/users with deadlines

CREATE TABLE IF NOT EXISTS `learning_item_instances` (
  `id`                INT          AUTO_INCREMENT PRIMARY KEY,
  `title`             VARCHAR(255) NOT NULL,
  `description`       TEXT,
  `item_type`         ENUM('course', 'quiz') NOT NULL,
  `source_id`         INT          NOT NULL,           -- course.id OR feedback_forms.id
  `source_title`      VARCHAR(255) NOT NULL,           -- denormalised for display after deletion
  `assigned_to_all`   TINYINT(1)   NOT NULL DEFAULT 0,
  `start_date`        DATE         DEFAULT NULL,
  `deadline`          DATE         DEFAULT NULL,
  `max_attempts`      INT          DEFAULT NULL,       -- NULL = unlimited (quiz only)
  `passing_score`     DECIMAL(5,2) DEFAULT NULL,       -- NULL = no threshold (quiz only)
  `status`            ENUM('draft','active','closed','expired') NOT NULL DEFAULT 'draft',
  `created_by`        VARCHAR(36)  NOT NULL,
  `created_at`        TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  `updated_at`        TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_lii_type_source`  (`item_type`, `source_id`),
  INDEX `idx_lii_status`       (`status`),
  INDEX `idx_lii_deadline`     (`deadline`),
  INDEX `idx_lii_created_by`   (`created_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Batch assignments per instance
CREATE TABLE IF NOT EXISTS `learning_item_instance_batches` (
  `id`          INT AUTO_INCREMENT PRIMARY KEY,
  `instance_id` INT NOT NULL,
  `batch_id`    INT NOT NULL,
  `created_at`  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`instance_id`) REFERENCES `learning_item_instances`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `uk_liib_instance_batch` (`instance_id`, `batch_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Per-user progress tracking
CREATE TABLE IF NOT EXISTS `learning_item_progress` (
  `id`           INT AUTO_INCREMENT PRIMARY KEY,
  `instance_id`  INT          NOT NULL,
  `user_id`      VARCHAR(36)  NOT NULL,
  `attempts`     INT          NOT NULL DEFAULT 0,
  `score`        DECIMAL(5,2) DEFAULT NULL,
  `status`       ENUM('not_started','in_progress','completed','passed','failed') NOT NULL DEFAULT 'not_started',
  `started_at`   TIMESTAMP    NULL,
  `completed_at` TIMESTAMP    NULL,
  `created_at`   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  `updated_at`   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`instance_id`) REFERENCES `learning_item_instances`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `uk_lip_instance_user` (`instance_id`, `user_id`),
  INDEX `idx_lip_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
