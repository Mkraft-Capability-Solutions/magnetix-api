-- ========================================
-- STORED PROCEDURES: Student Certificates
-- ========================================
-- Procedures for certificate CRUD operations
-- ========================================

USE lms_db;

DELIMITER $$

-- ========================================
-- Get Student Certificates by Status
-- ========================================
DROP PROCEDURE IF EXISTS `get_student_certificates`$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `get_student_certificates` (
  IN `p_user_id` VARCHAR(36),
  IN `p_status` VARCHAR(20)
)
BEGIN
  SELECT
    id,
    user_id,
    certificate_name AS name,
    organization,
    issue_date AS issueDate,
    expiry_date AS expiryDate,
    credential_id AS credentialId,
    certificate_link AS certificateLink,
    file_path AS filePath,
    logo_path AS logo,
    status,
    issued_by_org AS issuedByOrg,
    created_at AS createdAt,
    updated_at AS updatedAt
  FROM student_certificates
  WHERE user_id = p_user_id
    AND status = p_status
  ORDER BY created_at DESC;
END$$

-- ========================================
-- Create Certificate
-- ========================================
DROP PROCEDURE IF EXISTS `create_certificate`$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `create_certificate` (
  IN `p_user_id` VARCHAR(36),
  IN `p_certificate_name` VARCHAR(255),
  IN `p_organization` VARCHAR(255),
  IN `p_issue_date` DATE,
  IN `p_expiry_date` DATE,
  IN `p_credential_id` VARCHAR(255),
  IN `p_certificate_link` VARCHAR(500),
  IN `p_file_path` VARCHAR(500),
  IN `p_logo_path` VARCHAR(500),
  IN `p_issued_by_org` BOOLEAN
)
BEGIN
  INSERT INTO student_certificates (
    user_id,
    certificate_name,
    organization,
    issue_date,
    expiry_date,
    credential_id,
    certificate_link,
    file_path,
    logo_path,
    issued_by_org,
    status
  ) VALUES (
    p_user_id,
    p_certificate_name,
    p_organization,
    p_issue_date,
    p_expiry_date,
    p_credential_id,
    p_certificate_link,
    p_file_path,
    p_logo_path,
    p_issued_by_org,
    'pending'
  );

  -- Return the newly created certificate
  SELECT
    id,
    user_id,
    certificate_name AS name,
    organization,
    issue_date AS issueDate,
    expiry_date AS expiryDate,
    credential_id AS credentialId,
    certificate_link AS certificateLink,
    file_path AS filePath,
    logo_path AS logo,
    status,
    issued_by_org AS issuedByOrg,
    created_at AS createdAt,
    updated_at AS updatedAt
  FROM student_certificates
  WHERE id = LAST_INSERT_ID();
END$$

-- ========================================
-- Update Certificate Status (Admin)
-- ========================================
DROP PROCEDURE IF EXISTS `update_certificate_status`$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `update_certificate_status` (
  IN `p_certificate_id` INT,
  IN `p_status` VARCHAR(20)
)
BEGIN
  UPDATE student_certificates
  SET status = p_status,
      updated_at = CURRENT_TIMESTAMP
  WHERE id = p_certificate_id;

  -- Return updated certificate
  SELECT
    id,
    user_id,
    certificate_name AS name,
    organization,
    issue_date AS issueDate,
    expiry_date AS expiryDate,
    credential_id AS credentialId,
    certificate_link AS certificateLink,
    file_path AS filePath,
    logo_path AS logo,
    status,
    issued_by_org AS issuedByOrg,
    created_at AS createdAt,
    updated_at AS updatedAt
  FROM student_certificates
  WHERE id = p_certificate_id;
END$$

-- ========================================
-- Delete Certificate
-- ========================================
DROP PROCEDURE IF EXISTS `delete_certificate`$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `delete_certificate` (
  IN `p_certificate_id` INT,
  IN `p_user_id` VARCHAR(36)
)
BEGIN
  -- Return file path before deletion (for cleanup)
  SELECT file_path
  FROM student_certificates
  WHERE id = p_certificate_id AND user_id = p_user_id;

  -- Delete the certificate
  DELETE FROM student_certificates
  WHERE id = p_certificate_id AND user_id = p_user_id;
END$$

DELIMITER ;

SELECT 'Certificate stored procedures created successfully!' AS status;
