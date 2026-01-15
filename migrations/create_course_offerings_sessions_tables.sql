-- =============================================
-- Course Offerings and Sessions Tables
-- For ILT and Blended Learning Courses
-- Created: 2026-01-14
-- =============================================

-- =============================================
-- CREATE TABLES
-- =============================================

-- Course Offerings (Training Schedules for a Course)
CREATE TABLE IF NOT EXISTS course_offering (
  id INT PRIMARY KEY AUTO_INCREMENT,
  course_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  location_id INT,
  location_name VARCHAR(255), -- For custom locations not in training_locations
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  timezone VARCHAR(50) DEFAULT 'EST',
  total_seats INT NOT NULL DEFAULT 0,
  available_seats INT NOT NULL DEFAULT 0,
  enable_waitlist TINYINT(1) DEFAULT 0,
  status ENUM('Draft', 'Published', 'In Progress', 'Completed', 'Cancelled') DEFAULT 'Draft',
  creator_id VARCHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  is_deleted TINYINT(1) DEFAULT 0,

  FOREIGN KEY (course_id) REFERENCES course(id) ON DELETE CASCADE,
  FOREIGN KEY (location_id) REFERENCES training_locations(id) ON DELETE SET NULL,
  FOREIGN KEY (creator_id) REFERENCES users(uuid),
  INDEX idx_course (course_id, is_deleted),
  INDEX idx_status (status, is_deleted),
  INDEX idx_dates (start_date, end_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Course Sessions (Individual Training Sessions within an Offering)
CREATE TABLE IF NOT EXISTS course_session (
  id INT PRIMARY KEY AUTO_INCREMENT,
  course_id INT NOT NULL,
  offering_id INT, -- Optional: link to offering if part of a scheduled offering
  section_id INT, -- Optional: link to course section
  lesson_id INT, -- Optional: link to specific lesson if session covers a lesson
  name VARCHAR(255) NOT NULL,
  session_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  instructor_id VARCHAR(36), -- Link to trainer/instructor
  delivery_method ENUM('In-Person', 'Virtual', 'Hybrid') DEFAULT 'Virtual',
  location_id INT, -- For in-person sessions
  room_id INT, -- Specific room if applicable
  location_room VARCHAR(255), -- Custom location/room if not using ILT resources
  virtual_meeting_link VARCHAR(1000), -- For virtual/hybrid sessions
  max_capacity INT DEFAULT 0,
  enrolled_count INT DEFAULT 0,
  description TEXT,
  materials TEXT, -- JSON array of materials/resources
  status ENUM('Scheduled', 'In Progress', 'Completed', 'Cancelled') DEFAULT 'Scheduled',
  creator_id VARCHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  is_deleted TINYINT(1) DEFAULT 0,

  FOREIGN KEY (course_id) REFERENCES course(id) ON DELETE CASCADE,
  FOREIGN KEY (offering_id) REFERENCES course_offering(id) ON DELETE CASCADE,
  FOREIGN KEY (section_id) REFERENCES course_section(id) ON DELETE SET NULL,
  FOREIGN KEY (lesson_id) REFERENCES course_lesson(id) ON DELETE SET NULL,
  FOREIGN KEY (instructor_id) REFERENCES users(uuid),
  FOREIGN KEY (location_id) REFERENCES training_locations(id) ON DELETE SET NULL,
  FOREIGN KEY (room_id) REFERENCES training_rooms(id) ON DELETE SET NULL,
  FOREIGN KEY (creator_id) REFERENCES users(uuid),
  INDEX idx_course (course_id, is_deleted),
  INDEX idx_offering (offering_id, is_deleted),
  INDEX idx_instructor (instructor_id),
  INDEX idx_date (session_date, start_time),
  INDEX idx_status (status, is_deleted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Session Enrollments (Track student attendance/participation)
CREATE TABLE IF NOT EXISTS session_enrollment (
  id INT PRIMARY KEY AUTO_INCREMENT,
  session_id INT NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  enrollment_status ENUM('Registered', 'Attended', 'Absent', 'Cancelled') DEFAULT 'Registered',
  attendance_marked_at TIMESTAMP NULL,
  feedback_rating INT DEFAULT NULL, -- 1-5 rating
  feedback_comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  is_deleted TINYINT(1) DEFAULT 0,

  FOREIGN KEY (session_id) REFERENCES course_session(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(uuid),
  UNIQUE KEY unique_enrollment (session_id, user_id, is_deleted),
  INDEX idx_session (session_id, is_deleted),
  INDEX idx_user (user_id, is_deleted),
  INDEX idx_status (enrollment_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =============================================
-- STORED PROCEDURES
-- =============================================

DROP PROCEDURE IF EXISTS sp_create_course_offering;
DROP PROCEDURE IF EXISTS sp_get_course_offerings;
DROP PROCEDURE IF EXISTS sp_update_course_offering;
DROP PROCEDURE IF EXISTS sp_delete_course_offering;

DROP PROCEDURE IF EXISTS sp_create_course_session;
DROP PROCEDURE IF EXISTS sp_get_course_sessions;
DROP PROCEDURE IF EXISTS sp_update_course_session;
DROP PROCEDURE IF EXISTS sp_delete_course_session;

DELIMITER //

-- Create Course Offering
CREATE PROCEDURE sp_create_course_offering(
  IN p_course_id INT,
  IN p_name VARCHAR(255),
  IN p_location_id INT,
  IN p_location_name VARCHAR(255),
  IN p_start_date DATE,
  IN p_end_date DATE,
  IN p_timezone VARCHAR(50),
  IN p_total_seats INT,
  IN p_enable_waitlist TINYINT(1),
  IN p_creator_id VARCHAR(36)
)
BEGIN
  INSERT INTO course_offering (
    course_id, name, location_id, location_name, start_date, end_date,
    timezone, total_seats, available_seats, enable_waitlist, creator_id
  ) VALUES (
    p_course_id, p_name, p_location_id, p_location_name, p_start_date, p_end_date,
    p_timezone, p_total_seats, p_total_seats, p_enable_waitlist, p_creator_id
  );

  SELECT LAST_INSERT_ID() as id, 'Offering created successfully' as message;
END //

-- Get Course Offerings
CREATE PROCEDURE sp_get_course_offerings(
  IN p_course_id INT
)
BEGIN
  SELECT
    o.id,
    o.course_id as courseId,
    o.name,
    o.location_id as locationId,
    COALESCE(l.name, o.location_name) as location,
    o.start_date as startDate,
    o.end_date as endDate,
    o.timezone,
    o.total_seats as totalSeats,
    o.available_seats as availableSeats,
    o.enable_waitlist as enableWaitlist,
    o.status,
    o.created_at as createdAt,
    (SELECT COUNT(*) FROM course_session WHERE offering_id = o.id AND is_deleted = 0) as sessionCount
  FROM course_offering o
  LEFT JOIN training_locations l ON o.location_id = l.id
  WHERE o.course_id = p_course_id AND o.is_deleted = 0
  ORDER BY o.start_date DESC;
END //

-- Update Course Offering
CREATE PROCEDURE sp_update_course_offering(
  IN p_offering_id INT,
  IN p_name VARCHAR(255),
  IN p_location_id INT,
  IN p_location_name VARCHAR(255),
  IN p_start_date DATE,
  IN p_end_date DATE,
  IN p_timezone VARCHAR(50),
  IN p_total_seats INT,
  IN p_enable_waitlist TINYINT(1),
  IN p_status VARCHAR(50)
)
BEGIN
  UPDATE course_offering
  SET
    name = p_name,
    location_id = p_location_id,
    location_name = p_location_name,
    start_date = p_start_date,
    end_date = p_end_date,
    timezone = p_timezone,
    total_seats = p_total_seats,
    enable_waitlist = p_enable_waitlist,
    status = p_status
  WHERE id = p_offering_id AND is_deleted = 0;

  SELECT 'Offering updated successfully' as message;
END //

-- Delete Course Offering
CREATE PROCEDURE sp_delete_course_offering(
  IN p_offering_id INT
)
BEGIN
  UPDATE course_offering
  SET is_deleted = 1
  WHERE id = p_offering_id;

  -- Also soft delete associated sessions
  UPDATE course_session
  SET is_deleted = 1
  WHERE offering_id = p_offering_id;

  SELECT 'Offering deleted successfully' as message;
END //

-- Create Course Session
CREATE PROCEDURE sp_create_course_session(
  IN p_course_id INT,
  IN p_offering_id INT,
  IN p_section_id INT,
  IN p_lesson_id INT,
  IN p_name VARCHAR(255),
  IN p_session_date DATE,
  IN p_start_time TIME,
  IN p_end_time TIME,
  IN p_instructor_id VARCHAR(36),
  IN p_delivery_method VARCHAR(20),
  IN p_location_id INT,
  IN p_room_id INT,
  IN p_location_room VARCHAR(255),
  IN p_virtual_meeting_link VARCHAR(1000),
  IN p_max_capacity INT,
  IN p_description TEXT,
  IN p_creator_id VARCHAR(36)
)
BEGIN
  INSERT INTO course_session (
    course_id, offering_id, section_id, lesson_id, name, session_date,
    start_time, end_time, instructor_id, delivery_method, location_id,
    room_id, location_room, virtual_meeting_link, max_capacity,
    description, creator_id
  ) VALUES (
    p_course_id, p_offering_id, p_section_id, p_lesson_id, p_name, p_session_date,
    p_start_time, p_end_time, p_instructor_id, p_delivery_method, p_location_id,
    p_room_id, p_location_room, p_virtual_meeting_link, p_max_capacity,
    p_description, p_creator_id
  );

  SELECT LAST_INSERT_ID() as id, 'Session created successfully' as message;
END //

-- Get Course Sessions
CREATE PROCEDURE sp_get_course_sessions(
  IN p_course_id INT,
  IN p_offering_id INT
)
BEGIN
  SELECT
    s.id,
    s.course_id as courseId,
    s.offering_id as offeringId,
    s.section_id as sectionId,
    s.lesson_id as lessonId,
    s.name,
    s.session_date as sessionDate,
    s.start_time as startTime,
    s.end_time as endTime,
    s.instructor_id as instructorId,
    CONCAT(COALESCE(st.first_name, ''), ' ', COALESCE(st.last_name, '')) as instructorName,
    s.delivery_method as deliveryMethod,
    s.location_id as locationId,
    COALESCE(l.name, s.location_room) as location,
    s.room_id as roomId,
    r.name as roomName,
    s.virtual_meeting_link as virtualMeetingLink,
    s.max_capacity as maxCapacity,
    s.enrolled_count as enrolledCount,
    s.description,
    s.status,
    s.created_at as createdAt
  FROM course_session s
  LEFT JOIN users u ON s.instructor_id = u.uuid
  LEFT JOIN students st ON u.uuid = st.user_id
  LEFT JOIN training_locations l ON s.location_id = l.id
  LEFT JOIN training_rooms r ON s.room_id = r.id
  WHERE s.course_id = p_course_id
    AND (p_offering_id IS NULL OR s.offering_id = p_offering_id)
    AND s.is_deleted = 0
  ORDER BY s.session_date, s.start_time;
END //

-- Update Course Session
CREATE PROCEDURE sp_update_course_session(
  IN p_session_id INT,
  IN p_name VARCHAR(255),
  IN p_session_date DATE,
  IN p_start_time TIME,
  IN p_end_time TIME,
  IN p_instructor_id VARCHAR(36),
  IN p_delivery_method VARCHAR(20),
  IN p_location_id INT,
  IN p_room_id INT,
  IN p_location_room VARCHAR(255),
  IN p_virtual_meeting_link VARCHAR(1000),
  IN p_max_capacity INT,
  IN p_description TEXT,
  IN p_status VARCHAR(50)
)
BEGIN
  UPDATE course_session
  SET
    name = p_name,
    session_date = p_session_date,
    start_time = p_start_time,
    end_time = p_end_time,
    instructor_id = p_instructor_id,
    delivery_method = p_delivery_method,
    location_id = p_location_id,
    room_id = p_room_id,
    location_room = p_location_room,
    virtual_meeting_link = p_virtual_meeting_link,
    max_capacity = p_max_capacity,
    description = p_description,
    status = p_status
  WHERE id = p_session_id AND is_deleted = 0;

  SELECT 'Session updated successfully' as message;
END //

-- Delete Course Session
CREATE PROCEDURE sp_delete_course_session(
  IN p_session_id INT
)
BEGIN
  UPDATE course_session
  SET is_deleted = 1
  WHERE id = p_session_id;

  SELECT 'Session deleted successfully' as message;
END //

DELIMITER ;

-- =============================================
-- VERIFICATION
-- =============================================
SELECT 'Course offerings and sessions tables created successfully' as message;
