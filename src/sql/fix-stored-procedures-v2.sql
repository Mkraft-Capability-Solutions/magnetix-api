-- Update stored procedures to use utf8mb4_general_ci
-- Remove explicit COLLATE clauses since DB is now consistent

DROP PROCEDURE IF EXISTS sp_get_all_locations;

DELIMITER //
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
  WHERE l.is_deleted = 0
    AND (p_search IS NULL OR p_search = '' OR
         l.name LIKE CONCAT('%', p_search, '%') OR
         l.city LIKE CONCAT('%', p_search, '%') OR
         l.address LIKE CONCAT('%', p_search, '%'))
    AND (p_status IS NULL OR p_status = '' OR p_status = 'All Status' OR l.status = p_status)
  ORDER BY l.created_at DESC;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_get_all_rooms;

DELIMITER //
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
    AND (p_search IS NULL OR p_search = '' OR
         r.name LIKE CONCAT('%', p_search, '%') OR
         l.name LIKE CONCAT('%', p_search, '%'))
    AND (p_status IS NULL OR p_status = '' OR p_status = 'All Status' OR r.status = p_status)
    AND (p_location_id IS NULL OR r.location_id = p_location_id)
    AND (p_type IS NULL OR p_type = '' OR r.type = p_type)
  ORDER BY r.created_at DESC;
END //
DELIMITER ;

SELECT 'Stored procedures updated successfully!' as status;
