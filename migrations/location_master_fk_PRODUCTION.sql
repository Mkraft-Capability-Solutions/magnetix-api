-- =====================================================================
-- ILT Resource Management — Location master FK support (PRODUCTION)
-- Safe to run in phpMyAdmin. Idempotent: re-running causes no errors
-- and no data loss.
--
-- BEFORE RUNNING:
--   1. Take a database backup (Export tab) — recommended for any prod change.
--   2. Select the correct database in the left panel (so DATABASE() resolves
--      to your app schema). Do NOT add a USE statement unless you edit the name.
--
-- WHAT IT DOES:
--   Part 1 — adds nullable country_id / state_id / district_id columns +
--            indexes to training_locations (only if missing).
--   Part 2 — recreates the read procedures so they return
--            countryId / stateId / districtId to the app.
-- NOTE: DDL (ALTER / CREATE PROCEDURE) auto-commits and cannot be rolled
--       back in a transaction; that is why this script is written to be
--       non-destructive and idempotent instead.
-- =====================================================================


-- ---------------------------------------------------------------------
-- PART 1: Add foreign-key columns to training_locations (idempotent)
-- ---------------------------------------------------------------------

-- country_id
SET @exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'training_locations'
    AND COLUMN_NAME = 'country_id'
);
SET @ddl := IF(@exists = 0,
  'ALTER TABLE training_locations ADD COLUMN country_id INT NULL AFTER country, ADD INDEX idx_country_id (country_id)',
  'DO 0');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- state_id
SET @exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'training_locations'
    AND COLUMN_NAME = 'state_id'
);
SET @ddl := IF(@exists = 0,
  'ALTER TABLE training_locations ADD COLUMN state_id INT NULL AFTER state, ADD INDEX idx_state_id (state_id)',
  'DO 0');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- district_id
SET @exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'training_locations'
    AND COLUMN_NAME = 'district_id'
);
SET @ddl := IF(@exists = 0,
  'ALTER TABLE training_locations ADD COLUMN district_id INT NULL AFTER city, ADD INDEX idx_district_id (district_id)',
  'DO 0');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;


-- ---------------------------------------------------------------------
-- PART 2: Recreate read procedures to return the ID columns
-- ---------------------------------------------------------------------
DELIMITER $$

DROP PROCEDURE IF EXISTS sp_get_all_locations $$
CREATE PROCEDURE sp_get_all_locations(
  IN p_search VARCHAR(100),
  IN p_status VARCHAR(20)
)
BEGIN
  SELECT
    l.id,
    l.name,
    l.city,
    l.state,
    l.country,
    l.country_id  AS countryId,
    l.state_id    AS stateId,
    l.district_id AS districtId,
    l.address,
    l.zip_code    AS zipCode,
    l.email,
    l.phone,
    l.capacity,
    l.timezone,
    l.manager,
    l.facilities,
    l.status,
    COUNT(r.id)   AS rooms,
    l.created_at  AS createdAt,
    l.updated_at  AS updatedAt
  FROM training_locations l
  LEFT JOIN training_rooms r ON l.id = r.location_id AND r.is_deleted = 0
  WHERE l.is_deleted = 0
    AND (p_search IS NULL OR p_search = '' OR l.name LIKE CONCAT('%', p_search, '%') OR l.city LIKE CONCAT('%', p_search, '%'))
    AND (p_status IS NULL OR p_status = '' OR p_status = 'All Status' OR l.status = p_status)
  GROUP BY l.id
  ORDER BY l.created_at DESC;
END $$

DROP PROCEDURE IF EXISTS sp_get_location_by_id $$
CREATE PROCEDURE sp_get_location_by_id(
  IN p_location_id INT
)
BEGIN
  -- Location details
  SELECT
    l.id,
    l.name,
    l.city,
    l.state,
    l.country,
    l.country_id  AS countryId,
    l.state_id    AS stateId,
    l.district_id AS districtId,
    l.address,
    l.zip_code    AS zipCode,
    l.email,
    l.phone,
    l.capacity,
    l.timezone,
    l.manager,
    l.facilities,
    l.status,
    l.created_at  AS createdAt,
    l.updated_at  AS updatedAt
  FROM training_locations l
  WHERE l.id = p_location_id AND l.is_deleted = 0;

  -- All rooms for this location
  SELECT
    r.id,
    r.name,
    r.room_number AS roomNumber,
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
END $$

DELIMITER ;
