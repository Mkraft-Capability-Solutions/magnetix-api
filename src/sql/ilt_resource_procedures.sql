-- =============================================
-- ILT (Instructor-Led Training) Resources Management
-- Database Schema and Stored Procedures
-- Created: 2026-01-05
-- =============================================

-- =============================================
-- DROP existing procedures
-- =============================================
DROP PROCEDURE IF EXISTS sp_get_all_locations;
DROP PROCEDURE IF EXISTS sp_get_location_by_id;
DROP PROCEDURE IF EXISTS sp_create_location;
DROP PROCEDURE IF EXISTS sp_update_location;
DROP PROCEDURE IF EXISTS sp_delete_location;

DROP PROCEDURE IF EXISTS sp_get_all_rooms;
DROP PROCEDURE IF EXISTS sp_get_room_by_id;
DROP PROCEDURE IF EXISTS sp_create_room;
DROP PROCEDURE IF EXISTS sp_update_room;
DROP PROCEDURE IF EXISTS sp_delete_room;

DROP PROCEDURE IF EXISTS sp_get_all_trainers;
DROP PROCEDURE IF EXISTS sp_get_trainer_by_id;
DROP PROCEDURE IF EXISTS sp_create_trainer;
DROP PROCEDURE IF EXISTS sp_update_trainer;
DROP PROCEDURE IF EXISTS sp_delete_trainer;

DROP PROCEDURE IF EXISTS sp_get_ilt_stats;

-- =============================================
-- CREATE TABLES
-- =============================================

-- Training Locations (Training Centers)
CREATE TABLE IF NOT EXISTS training_locations (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(200) NOT NULL,
  city VARCHAR(100) NOT NULL,
  state VARCHAR(100),
  country VARCHAR(100) DEFAULT 'USA',
  address TEXT NOT NULL,
  zip_code VARCHAR(20),
  email VARCHAR(100),
  phone VARCHAR(50),
  capacity INT DEFAULT 0,
  timezone VARCHAR(50),
  manager VARCHAR(200),
  facilities JSON,
  status ENUM('Active', 'Maintenance', 'Inactive') DEFAULT 'Active',
  is_deleted TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_status (status, is_deleted),
  INDEX idx_city (city),
  INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Training Rooms (linked to locations)
CREATE TABLE IF NOT EXISTS training_rooms (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(200) NOT NULL,
  room_number VARCHAR(50) NOT NULL,
  location_id INT NOT NULL,
  floor VARCHAR(50),
  type ENUM('Conference', 'Lab', 'Classroom', 'Virtual') DEFAULT 'Conference',
  capacity INT NOT NULL,
  area VARCHAR(50),
  description TEXT,
  amenities JSON,
  status ENUM('Active', 'Maintenance', 'Inactive') DEFAULT 'Active',
  is_deleted TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (location_id) REFERENCES training_locations(id) ON DELETE RESTRICT,
  INDEX idx_location (location_id, is_deleted),
  INDEX idx_status (status, is_deleted),
  INDEX idx_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Trainers (linked to users table)
CREATE TABLE IF NOT EXISTS trainers (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id VARCHAR(36) COLLATE utf8mb4_general_ci NOT NULL UNIQUE,
  bio TEXT COLLATE utf8mb4_general_ci,
  rating DECIMAL(3,2) DEFAULT 0.00,
  sessions INT DEFAULT 0,
  expertise JSON,
  certifications JSON,
  experience INT DEFAULT 0,
  rate DECIMAL(10,2) DEFAULT 0.00,
  availability ENUM('Full-Time', 'Part-Time', 'Contract') COLLATE utf8mb4_general_ci DEFAULT 'Full-Time',
  languages JSON,
  status ENUM('Active', 'On Leave', 'Inactive') COLLATE utf8mb4_general_ci DEFAULT 'Active',
  initials VARCHAR(5) COLLATE utf8mb4_general_ci,
  color VARCHAR(7) COLLATE utf8mb4_general_ci,
  is_deleted TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(uuid) ON DELETE CASCADE,
  INDEX idx_user (user_id, is_deleted),
  INDEX idx_status (status, is_deleted),
  INDEX idx_availability (availability)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

DELIMITER //

-- =============================================
-- LOCATIONS PROCEDURES
-- =============================================

-- Get all locations with filters and room count
CREATE PROCEDURE sp_get_all_locations(
  IN p_search VARCHAR(100),
  IN p_status VARCHAR(20)
)
BEGIN
  SELECT
    l.id,
    l.name,
    CONCAT(l.city, IFNULL(CONCAT(', ', l.state), '')) as city,
    l.state,
    l.country,
    l.address,
    l.zip_code as zipCode,
    l.email,
    l.phone,
    l.capacity,
    l.timezone,
    l.manager,
    l.facilities,
    l.status,
    COUNT(r.id) as rooms,
    l.created_at as createdAt,
    l.updated_at as updatedAt
  FROM training_locations l
  LEFT JOIN training_rooms r ON l.id = r.location_id AND r.is_deleted = 0
  WHERE l.is_deleted = 0
    AND (p_search IS NULL OR p_search = '' OR l.name LIKE CONCAT('%', p_search, '%') OR l.city LIKE CONCAT('%', p_search, '%'))
    AND (p_status IS NULL OR p_status = '' OR p_status = 'All Status' OR l.status = p_status)
  GROUP BY l.id, l.name, l.city, l.state, l.country, l.address, l.zip_code, l.email, l.phone, l.capacity, l.timezone, l.manager, l.facilities, l.status, l.created_at, l.updated_at
  ORDER BY l.created_at DESC;
END //

-- Get location by ID with all rooms
CREATE PROCEDURE sp_get_location_by_id(
  IN p_location_id INT
)
BEGIN
  -- Location details
  SELECT
    l.id,
    l.name,
    CONCAT(l.city, IFNULL(CONCAT(', ', l.state), '')) as city,
    l.state,
    l.country,
    l.address,
    l.zip_code as zipCode,
    l.email,
    l.phone,
    l.capacity,
    l.timezone,
    l.manager,
    l.facilities,
    l.status,
    l.created_at as createdAt,
    l.updated_at as updatedAt
  FROM training_locations l
  WHERE l.id = p_location_id AND l.is_deleted = 0;

  -- All rooms for this location
  SELECT
    r.id,
    r.name,
    r.room_number as roomNumber,
    r.floor,
    r.type,
    r.capacity,
    r.area,
    r.description,
    r.amenities,
    r.status
  FROM training_rooms r
  WHERE r.location_id = p_location_id AND r.is_deleted = 0
  ORDER BY r.name;
END //

-- Create new location
CREATE PROCEDURE sp_create_location(
  IN p_name VARCHAR(200),
  IN p_city VARCHAR(100),
  IN p_state VARCHAR(100),
  IN p_country VARCHAR(100),
  IN p_address TEXT,
  IN p_zip_code VARCHAR(20),
  IN p_email VARCHAR(100),
  IN p_phone VARCHAR(50),
  IN p_capacity INT,
  IN p_timezone VARCHAR(50),
  IN p_manager VARCHAR(200),
  IN p_facilities JSON
)
BEGIN
  INSERT INTO training_locations (
    name, city, state, country, address, zip_code,
    email, phone, capacity, timezone, manager, facilities
  ) VALUES (
    p_name, p_city, p_state, p_country, p_address, p_zip_code,
    p_email, p_phone, p_capacity, p_timezone, p_manager, p_facilities
  );

  SELECT LAST_INSERT_ID() as id;
END //

-- Update existing location
CREATE PROCEDURE sp_update_location(
  IN p_location_id INT,
  IN p_name VARCHAR(200),
  IN p_city VARCHAR(100),
  IN p_state VARCHAR(100),
  IN p_country VARCHAR(100),
  IN p_address TEXT,
  IN p_zip_code VARCHAR(20),
  IN p_email VARCHAR(100),
  IN p_phone VARCHAR(50),
  IN p_capacity INT,
  IN p_timezone VARCHAR(50),
  IN p_manager VARCHAR(200),
  IN p_facilities JSON,
  IN p_status VARCHAR(20)
)
BEGIN
  UPDATE training_locations
  SET
    name = p_name,
    city = p_city,
    state = p_state,
    country = p_country,
    address = p_address,
    zip_code = p_zip_code,
    email = p_email,
    phone = p_phone,
    capacity = p_capacity,
    timezone = p_timezone,
    manager = p_manager,
    facilities = p_facilities,
    status = p_status
  WHERE id = p_location_id AND is_deleted = 0;

  SELECT ROW_COUNT() as affectedRows;
END //

-- Delete location (soft delete with room check)
CREATE PROCEDURE sp_delete_location(
  IN p_location_id INT
)
BEGIN
  DECLARE v_room_count INT DEFAULT 0;

  -- Check for active rooms
  SELECT COUNT(*) INTO v_room_count
  FROM training_rooms
  WHERE location_id = p_location_id AND is_deleted = 0;

  IF v_room_count > 0 THEN
    SELECT
      0 as success,
      CONCAT('Cannot delete location: has ', v_room_count, ' active room(s)') as message,
      v_room_count as roomCount;
  ELSE
    UPDATE training_locations
    SET is_deleted = 1
    WHERE id = p_location_id;

    SELECT
      1 as success,
      'Location deleted successfully' as message,
      0 as roomCount;
  END IF;
END //

-- =============================================
-- ROOMS PROCEDURES
-- =============================================

-- Get all rooms with location info
CREATE PROCEDURE sp_get_all_rooms(
  IN p_search VARCHAR(100),
  IN p_status VARCHAR(20),
  IN p_location_id INT,
  IN p_type VARCHAR(20)
)
BEGIN
  SELECT
    r.id,
    r.name,
    r.room_number as roomNumber,
    r.location_id as locationId,
    l.name as location,
    r.floor,
    r.type,
    r.capacity,
    r.area,
    r.description,
    r.amenities,
    r.status,
    r.created_at as createdAt,
    r.updated_at as updatedAt
  FROM training_rooms r
  INNER JOIN training_locations l ON r.location_id = l.id AND l.is_deleted = 0
  WHERE r.is_deleted = 0
    AND (p_search IS NULL OR p_search = '' OR r.name LIKE CONCAT('%', p_search, '%') OR l.name LIKE CONCAT('%', p_search, '%'))
    AND (p_status IS NULL OR p_status = '' OR p_status = 'All Status' OR r.status = p_status)
    AND (p_location_id IS NULL OR r.location_id = p_location_id)
    AND (p_type IS NULL OR p_type = '' OR r.type = p_type)
  ORDER BY r.created_at DESC;
END //

-- Get room by ID with location
CREATE PROCEDURE sp_get_room_by_id(
  IN p_room_id INT
)
BEGIN
  SELECT
    r.id,
    r.name,
    r.room_number as roomNumber,
    r.location_id as locationId,
    l.name as location,
    r.floor,
    r.type,
    r.capacity,
    r.area,
    r.description,
    r.amenities,
    r.status,
    r.created_at as createdAt,
    r.updated_at as updatedAt
  FROM training_rooms r
  INNER JOIN training_locations l ON r.location_id = l.id
  WHERE r.id = p_room_id AND r.is_deleted = 0;
END //

-- Create new room
CREATE PROCEDURE sp_create_room(
  IN p_name VARCHAR(200),
  IN p_room_number VARCHAR(50),
  IN p_location_id INT,
  IN p_floor VARCHAR(50),
  IN p_type VARCHAR(20),
  IN p_capacity INT,
  IN p_area VARCHAR(50),
  IN p_description TEXT,
  IN p_amenities JSON
)
BEGIN
  DECLARE v_location_exists INT DEFAULT 0;

  -- Validate location exists
  SELECT COUNT(*) INTO v_location_exists
  FROM training_locations
  WHERE id = p_location_id AND is_deleted = 0;

  IF v_location_exists = 0 THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Location not found';
  END IF;

  INSERT INTO training_rooms (
    name, room_number, location_id, floor, type,
    capacity, area, description, amenities
  ) VALUES (
    p_name, p_room_number, p_location_id, p_floor, p_type,
    p_capacity, p_area, p_description, p_amenities
  );

  SELECT LAST_INSERT_ID() as id;
END //

-- Update existing room
CREATE PROCEDURE sp_update_room(
  IN p_room_id INT,
  IN p_name VARCHAR(200),
  IN p_room_number VARCHAR(50),
  IN p_location_id INT,
  IN p_floor VARCHAR(50),
  IN p_type VARCHAR(20),
  IN p_capacity INT,
  IN p_area VARCHAR(50),
  IN p_description TEXT,
  IN p_amenities JSON,
  IN p_status VARCHAR(20)
)
BEGIN
  DECLARE v_location_exists INT DEFAULT 0;

  -- Validate location exists
  SELECT COUNT(*) INTO v_location_exists
  FROM training_locations
  WHERE id = p_location_id AND is_deleted = 0;

  IF v_location_exists = 0 THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Location not found';
  END IF;

  UPDATE training_rooms
  SET
    name = p_name,
    room_number = p_room_number,
    location_id = p_location_id,
    floor = p_floor,
    type = p_type,
    capacity = p_capacity,
    area = p_area,
    description = p_description,
    amenities = p_amenities,
    status = p_status
  WHERE id = p_room_id AND is_deleted = 0;

  SELECT ROW_COUNT() as affectedRows;
END //

-- Delete room (soft delete)
CREATE PROCEDURE sp_delete_room(
  IN p_room_id INT
)
BEGIN
  UPDATE training_rooms
  SET is_deleted = 1
  WHERE id = p_room_id;

  SELECT
    1 as success,
    'Room deleted successfully' as message;
END //

-- =============================================
-- TRAINERS PROCEDURES
-- =============================================

-- Get all trainers with user info
CREATE PROCEDURE sp_get_all_trainers(
  IN p_search VARCHAR(100),
  IN p_status VARCHAR(20),
  IN p_availability VARCHAR(20)
)
BEGIN
  SELECT
    t.id,
    t.user_id as userId,
    s.first_name as firstName,
    s.last_name as lastName,
    u.email,
    s.contact as phone,
    t.bio,
    t.rating,
    t.sessions,
    t.expertise,
    t.certifications,
    t.experience,
    t.rate,
    t.availability,
    t.languages,
    t.status,
    t.initials,
    t.color,
    t.created_at as createdAt,
    t.updated_at as updatedAt
  FROM trainers t
  INNER JOIN users u ON t.user_id = u.uuid
  LEFT JOIN students s ON u.uuid = s.user_id
  WHERE t.is_deleted = 0
    AND (p_search IS NULL OR p_search = '' OR s.first_name LIKE CONCAT('%', p_search, '%') OR s.last_name LIKE CONCAT('%', p_search, '%') OR u.email LIKE CONCAT('%', p_search, '%'))
    AND (p_status IS NULL OR p_status = '' OR p_status = 'All Status' OR t.status = p_status)
    AND (p_availability IS NULL OR p_availability = '' OR t.availability = p_availability)
  ORDER BY t.created_at DESC;
END //

-- Get trainer by ID with user info
CREATE PROCEDURE sp_get_trainer_by_id(
  IN p_trainer_id INT
)
BEGIN
  SELECT
    t.id,
    t.user_id as userId,
    s.first_name as firstName,
    s.last_name as lastName,
    u.email,
    s.contact as phone,
    t.bio,
    t.rating,
    t.sessions,
    t.expertise,
    t.certifications,
    t.experience,
    t.rate,
    t.availability,
    t.languages,
    t.status,
    t.initials,
    t.color,
    t.created_at as createdAt,
    t.updated_at as updatedAt
  FROM trainers t
  INNER JOIN users u ON t.user_id = u.uuid
  LEFT JOIN students s ON u.uuid = s.user_id
  WHERE t.id = p_trainer_id AND t.is_deleted = 0;
END //

-- Create new trainer
CREATE PROCEDURE sp_create_trainer(
  IN p_user_id VARCHAR(36),
  IN p_bio TEXT,
  IN p_expertise JSON,
  IN p_certifications JSON,
  IN p_experience INT,
  IN p_rate DECIMAL(10,2),
  IN p_availability VARCHAR(20),
  IN p_languages JSON,
  IN p_initials VARCHAR(5),
  IN p_color VARCHAR(7)
)
BEGIN
  DECLARE v_user_exists INT DEFAULT 0;
  DECLARE v_trainer_exists INT DEFAULT 0;

  -- Validate user exists
  SELECT COUNT(*) INTO v_user_exists
  FROM users
  WHERE uuid = p_user_id AND is_deleted = 0;

  IF v_user_exists = 0 THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'User not found';
  END IF;

  -- Check if user already has trainer profile
  SELECT COUNT(*) INTO v_trainer_exists
  FROM trainers
  WHERE user_id = p_user_id AND is_deleted = 0;

  IF v_trainer_exists > 0 THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'User already has a trainer profile';
  END IF;

  INSERT INTO trainers (
    user_id, bio, expertise, certifications, experience,
    rate, availability, languages, initials, color
  ) VALUES (
    p_user_id, p_bio, p_expertise, p_certifications, p_experience,
    p_rate, p_availability, p_languages, p_initials, p_color
  );

  SELECT LAST_INSERT_ID() as id;
END //

-- Update existing trainer
CREATE PROCEDURE sp_update_trainer(
  IN p_trainer_id INT,
  IN p_bio TEXT,
  IN p_expertise JSON,
  IN p_certifications JSON,
  IN p_experience INT,
  IN p_rate DECIMAL(10,2),
  IN p_availability VARCHAR(20),
  IN p_languages JSON,
  IN p_status VARCHAR(20),
  IN p_initials VARCHAR(5),
  IN p_color VARCHAR(7)
)
BEGIN
  UPDATE trainers
  SET
    bio = p_bio,
    expertise = p_expertise,
    certifications = p_certifications,
    experience = p_experience,
    rate = p_rate,
    availability = p_availability,
    languages = p_languages,
    status = p_status,
    initials = p_initials,
    color = p_color
  WHERE id = p_trainer_id AND is_deleted = 0;

  SELECT ROW_COUNT() as affectedRows;
END //

-- Delete trainer (soft delete)
CREATE PROCEDURE sp_delete_trainer(
  IN p_trainer_id INT
)
BEGIN
  UPDATE trainers
  SET is_deleted = 1
  WHERE id = p_trainer_id;

  SELECT
    1 as success,
    'Trainer deleted successfully' as message;
END //

-- =============================================
-- STATISTICS PROCEDURE
-- =============================================

-- Get ILT statistics (real-time, active only)
CREATE PROCEDURE sp_get_ilt_stats()
BEGIN
  DECLARE v_total_locations INT DEFAULT 0;
  DECLARE v_available_rooms INT DEFAULT 0;
  DECLARE v_active_trainers INT DEFAULT 0;
  DECLARE v_total_capacity INT DEFAULT 0;

  -- Total active locations
  SELECT COUNT(*) INTO v_total_locations
  FROM training_locations
  WHERE is_deleted = 0 AND status = 'Active';

  -- Available rooms (active only)
  SELECT COUNT(*) INTO v_available_rooms
  FROM training_rooms
  WHERE is_deleted = 0 AND status = 'Active';

  -- Active trainers
  SELECT COUNT(*) INTO v_active_trainers
  FROM trainers
  WHERE is_deleted = 0 AND status = 'Active';

  -- Total capacity (sum of all active locations)
  SELECT COALESCE(SUM(capacity), 0) INTO v_total_capacity
  FROM training_locations
  WHERE is_deleted = 0 AND status = 'Active';

  SELECT
    v_total_locations as totalLocations,
    v_available_rooms as availableRooms,
    v_active_trainers as activeTrainers,
    v_total_capacity as totalCapacity;
END //

DELIMITER ;
