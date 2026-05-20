-- ========================================
-- STUDENT CORPORATE INFO STORED PROCEDURES
-- ========================================
-- CRUD procedures for student corporate information
-- ========================================

USE lms_db;

DELIMITER $$

-- ========================================
-- PROCEDURE: get_student_corporate_info
-- Retrieve corporate information for a student
-- ========================================
DROP PROCEDURE IF EXISTS get_student_corporate_info$$
CREATE PROCEDURE get_student_corporate_info(
  IN p_user_id VARCHAR(36)
)
BEGIN
  SELECT
    id,
    user_id,
    job_profile,
    designation,
    department,
    employee_id,
    doj,
    organization_name,
    location,
    manager_name,
    manager_email,
    manager_contact,
    created_at,
    updated_at
  FROM student_corporate_info
  WHERE user_id = p_user_id;
END$$

-- ========================================
-- PROCEDURE: upsert_student_corporate_info
-- Insert or update corporate information
-- Uses INSERT ... ON DUPLICATE KEY UPDATE
-- ========================================
DROP PROCEDURE IF EXISTS upsert_student_corporate_info$$
CREATE PROCEDURE upsert_student_corporate_info(
  IN p_user_id VARCHAR(36),
  IN p_job_profile VARCHAR(255),
  IN p_designation VARCHAR(255),
  IN p_department VARCHAR(255),
  IN p_employee_id VARCHAR(100),
  IN p_doj DATE,
  IN p_organization_name VARCHAR(255),
  IN p_location VARCHAR(255),
  IN p_manager_name VARCHAR(255),
  IN p_manager_email VARCHAR(255),
  IN p_manager_contact VARCHAR(20)
)
BEGIN
  INSERT INTO student_corporate_info (
    user_id,
    job_profile,
    designation,
    department,
    employee_id,
    doj,
    organization_name,
    location,
    manager_name,
    manager_email,
    manager_contact
  ) VALUES (
    p_user_id,
    p_job_profile,
    p_designation,
    p_department,
    p_employee_id,
    p_doj,
    p_organization_name,
    p_location,
    p_manager_name,
    p_manager_email,
    p_manager_contact
  )
  ON DUPLICATE KEY UPDATE
    job_profile = p_job_profile,
    designation = p_designation,
    department = p_department,
    employee_id = p_employee_id,
    doj = p_doj,
    organization_name = p_organization_name,
    location = p_location,
    manager_name = p_manager_name,
    manager_email = p_manager_email,
    manager_contact = p_manager_contact,
    updated_at = CURRENT_TIMESTAMP;

  -- Return the updated record
  SELECT
    id,
    user_id,
    job_profile,
    designation,
    department,
    employee_id,
    doj,
    organization_name,
    location,
    manager_name,
    manager_email,
    manager_contact,
    created_at,
    updated_at
  FROM student_corporate_info
  WHERE user_id = p_user_id;
END$$

-- ========================================
-- PROCEDURE: delete_student_corporate_info
-- Delete corporate information for a student
-- ========================================
DROP PROCEDURE IF EXISTS delete_student_corporate_info$$
CREATE PROCEDURE delete_student_corporate_info(
  IN p_user_id VARCHAR(36)
)
BEGIN
  DELETE FROM student_corporate_info
  WHERE user_id = p_user_id;

  SELECT ROW_COUNT() AS deleted_rows;
END$$

DELIMITER ;

SELECT 'Student corporate info procedures created successfully!' AS status;
