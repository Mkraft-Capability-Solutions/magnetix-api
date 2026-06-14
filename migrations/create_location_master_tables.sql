-- ========================================
-- LOCATION MASTER TABLES
-- ========================================
-- Creates master tables for Countries, States, and Districts
-- for cascading location selection in ILT Resources
-- ========================================

USE lms_db;

-- ========================================
-- TABLE 1: countries
-- ========================================
CREATE TABLE IF NOT EXISTS `countries` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `code` VARCHAR(3) NOT NULL,
  `phone_code` VARCHAR(10),
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_country_code` (`code`),
  INDEX `idx_name` (`name`),
  INDEX `idx_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ========================================
-- TABLE 2: states
-- ========================================
CREATE TABLE IF NOT EXISTS `states` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `country_id` INT NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `code` VARCHAR(10),
  `type` ENUM('State', 'Union Territory', 'Province', 'Region') DEFAULT 'State',
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`country_id`) REFERENCES `countries`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `unique_state_country` (`country_id`, `name`),
  INDEX `idx_country` (`country_id`),
  INDEX `idx_name` (`name`),
  INDEX `idx_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ========================================
-- TABLE 3: districts
-- ========================================
CREATE TABLE IF NOT EXISTS `districts` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `state_id` INT NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `code` VARCHAR(10),
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`state_id`) REFERENCES `states`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `unique_district_state` (`state_id`, `name`),
  INDEX `idx_state` (`state_id`),
  INDEX `idx_name` (`name`),
  INDEX `idx_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ========================================
-- INSERT INDIA DATA
-- ========================================

-- Insert India
INSERT INTO `countries` (`name`, `code`, `phone_code`) VALUES ('India', 'IN', '+91');

SET @india_id = LAST_INSERT_ID();

-- ========================================
-- INSERT INDIAN STATES AND UNION TERRITORIES
-- ========================================

-- States (28)
INSERT INTO `states` (`country_id`, `name`, `code`, `type`) VALUES
(@india_id, 'Andhra Pradesh', 'AP', 'State'),
(@india_id, 'Arunachal Pradesh', 'AR', 'State'),
(@india_id, 'Assam', 'AS', 'State'),
(@india_id, 'Bihar', 'BR', 'State'),
(@india_id, 'Chhattisgarh', 'CG', 'State'),
(@india_id, 'Goa', 'GA', 'State'),
(@india_id, 'Gujarat', 'GJ', 'State'),
(@india_id, 'Haryana', 'HR', 'State'),
(@india_id, 'Himachal Pradesh', 'HP', 'State'),
(@india_id, 'Jharkhand', 'JH', 'State'),
(@india_id, 'Karnataka', 'KA', 'State'),
(@india_id, 'Kerala', 'KL', 'State'),
(@india_id, 'Madhya Pradesh', 'MP', 'State'),
(@india_id, 'Maharashtra', 'MH', 'State'),
(@india_id, 'Manipur', 'MN', 'State'),
(@india_id, 'Meghalaya', 'ML', 'State'),
(@india_id, 'Mizoram', 'MZ', 'State'),
(@india_id, 'Nagaland', 'NL', 'State'),
(@india_id, 'Odisha', 'OD', 'State'),
(@india_id, 'Punjab', 'PB', 'State'),
(@india_id, 'Rajasthan', 'RJ', 'State'),
(@india_id, 'Sikkim', 'SK', 'State'),
(@india_id, 'Tamil Nadu', 'TN', 'State'),
(@india_id, 'Telangana', 'TS', 'State'),
(@india_id, 'Tripura', 'TR', 'State'),
(@india_id, 'Uttar Pradesh', 'UP', 'State'),
(@india_id, 'Uttarakhand', 'UK', 'State'),
(@india_id, 'West Bengal', 'WB', 'State');

-- Union Territories (8)
INSERT INTO `states` (`country_id`, `name`, `code`, `type`) VALUES
(@india_id, 'Andaman and Nicobar Islands', 'AN', 'Union Territory'),
(@india_id, 'Chandigarh', 'CH', 'Union Territory'),
(@india_id, 'Dadra and Nagar Haveli and Daman and Diu', 'DD', 'Union Territory'),
(@india_id, 'Delhi', 'DL', 'Union Territory'),
(@india_id, 'Jammu and Kashmir', 'JK', 'Union Territory'),
(@india_id, 'Ladakh', 'LA', 'Union Territory'),
(@india_id, 'Lakshadweep', 'LD', 'Union Territory'),
(@india_id, 'Puducherry', 'PY', 'Union Territory');

SELECT 'Location master tables created and India states inserted!' AS status;
