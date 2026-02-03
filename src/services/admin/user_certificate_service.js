const { promisePool } = require("../../config/db");

// ============================================================================
// ISSUE CERTIFICATE TO USER
// ============================================================================

exports.issueCertificateToUser = async (certificateData, issuedBy) => {
  const connection = await promisePool.getConnection();

  try {
    await connection.beginTransaction();

    const {
      certificate_title,
      certificate_name,
      user_id,
      description,
      issue_date,
      expiry_date,
      template_id,
      notes,
    } = certificateData;

    // Generate certificate number
    const [lastCert] = await connection.query(
      `SELECT certificate_number FROM admin_issued_certificates
       ORDER BY id DESC LIMIT 1`
    );

    let certificateNumber;
    if (lastCert.length > 0) {
      const lastNumber = parseInt(lastCert[0].certificate_number.split("-")[2]);
      const nextNumber = (lastNumber + 1).toString().padStart(6, "0");
      certificateNumber = `CERT-${new Date().getFullYear()}-${nextNumber}`;
    } else {
      certificateNumber = `CERT-${new Date().getFullYear()}-000001`;
    }

    // Insert certificate
    const [result] = await connection.query(
      `INSERT INTO admin_issued_certificates
       (certificate_number, certificate_title, certificate_name, user_id, description, issue_date,
        expiry_date, template_id, issued_by, status, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)`,
      [
        certificateNumber,
        certificate_title || 'Certificate of Achievement',
        certificate_name,
        user_id,
        description || null,
        issue_date || new Date(),
        expiry_date || null,
        template_id || 1,
        issuedBy,
        notes || null,
      ]
    );

    await connection.commit();

    // Fetch the created certificate with user details
    const [certificate] = await connection.query(
      `SELECT
        aic.*,
        COALESCE(s.first_name, i.first_name) as first_name,
        COALESCE(s.last_name, i.last_name) as last_name,
        u.email,
        ct.template_name,
        CONCAT(COALESCE(issuer_s.first_name, issuer_i.first_name, issuer_a.first_name), ' ',
               COALESCE(issuer_s.last_name, issuer_i.last_name, issuer_a.last_name)) as issued_by_name
       FROM admin_issued_certificates aic
       LEFT JOIN users u ON aic.user_id = u.uuid
       LEFT JOIN students s ON u.uuid = s.user_id AND u.role_id = 1
       LEFT JOIN instructors i ON u.uuid = i.user_id AND u.role_id = 2
       LEFT JOIN certificate_templates ct ON aic.template_id = ct.id
       LEFT JOIN users issuer ON aic.issued_by = issuer.uuid
       LEFT JOIN students issuer_s ON issuer.uuid = issuer_s.user_id AND issuer.role_id = 1
       LEFT JOIN instructors issuer_i ON issuer.uuid = issuer_i.user_id AND issuer.role_id = 2
       LEFT JOIN admins issuer_a ON issuer.uuid = issuer_a.user_id AND issuer.role_id IN (3, 4)
       WHERE aic.id = ?`,
      [result.insertId]
    );

    return {
      message: "Certificate issued successfully",
      certificate: certificate[0],
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

// ============================================================================
// GET ALL ISSUED CERTIFICATES
// ============================================================================

exports.getAllIssuedCertificates = async (page = 1, limit = 10, filters = {}) => {
  const connection = await promisePool.getConnection();

  try {
    const offset = (page - 1) * limit;
    const { status, search } = filters;

    let whereConditions = [];
    let queryParams = [];

    if (status) {
      whereConditions.push("aic.status = ?");
      queryParams.push(status);
    }

    if (search) {
      whereConditions.push(
        "(aic.certificate_name LIKE ? OR aic.certificate_number LIKE ? OR s.first_name LIKE ? OR s.last_name LIKE ? OR i.first_name LIKE ? OR i.last_name LIKE ?)"
      );
      const searchPattern = `%${search}%`;
      queryParams.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
    }

    const whereClause =
      whereConditions.length > 0 ? "WHERE " + whereConditions.join(" AND ") : "";

    // Get total count
    const [countResult] = await connection.query(
      `SELECT COUNT(*) as total
       FROM admin_issued_certificates aic
       LEFT JOIN users u ON aic.user_id = u.uuid
       LEFT JOIN students s ON u.uuid = s.user_id AND u.role_id = 1
       LEFT JOIN instructors i ON u.uuid = i.user_id AND u.role_id = 2
       ${whereClause}`,
      queryParams
    );

    const total = countResult[0].total;

    // Get certificates
    const [certificates] = await connection.query(
      `SELECT
        aic.*,
        COALESCE(s.first_name, i.first_name) as first_name,
        COALESCE(s.last_name, i.last_name) as last_name,
        u.email,
        ct.template_name,
        CONCAT(COALESCE(issuer_s.first_name, issuer_i.first_name, issuer_a.first_name), ' ',
               COALESCE(issuer_s.last_name, issuer_i.last_name, issuer_a.last_name)) as issued_by_name
       FROM admin_issued_certificates aic
       LEFT JOIN users u ON aic.user_id = u.uuid
       LEFT JOIN students s ON u.uuid = s.user_id AND u.role_id = 1
       LEFT JOIN instructors i ON u.uuid = i.user_id AND u.role_id = 2
       LEFT JOIN certificate_templates ct ON aic.template_id = ct.id
       LEFT JOIN users issuer ON aic.issued_by = issuer.uuid
       LEFT JOIN students issuer_s ON issuer.uuid = issuer_s.user_id AND issuer.role_id = 1
       LEFT JOIN instructors issuer_i ON issuer.uuid = issuer_i.user_id AND issuer.role_id = 2
       LEFT JOIN admins issuer_a ON issuer.uuid = issuer_a.user_id AND issuer.role_id IN (3, 4)
       ${whereClause}
       ORDER BY aic.created_at DESC
       LIMIT ? OFFSET ?`,
      [...queryParams, limit, offset]
    );

    return {
      data: certificates,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  } finally {
    connection.release();
  }
};

// ============================================================================
// GET CERTIFICATE BY ID
// ============================================================================

exports.getCertificateById = async (certificateId) => {
  const connection = await promisePool.getConnection();

  try {
    const [certificates] = await connection.query(
      `SELECT
        aic.*,
        COALESCE(s.first_name, i.first_name) as first_name,
        COALESCE(s.last_name, i.last_name) as last_name,
        u.email,
        ct.template_name,
        ct.template_file_path,
        CONCAT(COALESCE(issuer_s.first_name, issuer_i.first_name, issuer_a.first_name), ' ',
               COALESCE(issuer_s.last_name, issuer_i.last_name, issuer_a.last_name)) as issued_by_name
       FROM admin_issued_certificates aic
       LEFT JOIN users u ON aic.user_id = u.uuid
       LEFT JOIN students s ON u.uuid = s.user_id AND u.role_id = 1
       LEFT JOIN instructors i ON u.uuid = i.user_id AND u.role_id = 2
       LEFT JOIN certificate_templates ct ON aic.template_id = ct.id
       LEFT JOIN users issuer ON aic.issued_by = issuer.uuid
       LEFT JOIN students issuer_s ON issuer.uuid = issuer_s.user_id AND issuer.role_id = 1
       LEFT JOIN instructors issuer_i ON issuer.uuid = issuer_i.user_id AND issuer.role_id = 2
       LEFT JOIN admins issuer_a ON issuer.uuid = issuer_a.user_id AND issuer.role_id IN (3, 4)
       WHERE aic.id = ?`,
      [certificateId]
    );

    if (certificates.length === 0) {
      throw new Error("Certificate not found");
    }

    return { certificate: certificates[0] };
  } finally {
    connection.release();
  }
};

// ============================================================================
// DELETE CERTIFICATE
// ============================================================================

exports.deleteCertificate = async (certificateId) => {
  const connection = await promisePool.getConnection();

  try {
    const [result] = await connection.query(
      "DELETE FROM admin_issued_certificates WHERE id = ?",
      [certificateId]
    );

    if (result.affectedRows === 0) {
      throw new Error("Certificate not found");
    }

    return { message: "Certificate deleted successfully" };
  } finally {
    connection.release();
  }
};

// ============================================================================
// REVOKE CERTIFICATE
// ============================================================================

exports.revokeCertificate = async (certificateId, reason) => {
  const connection = await promisePool.getConnection();

  try {
    const [result] = await connection.query(
      `UPDATE admin_issued_certificates
       SET status = 'revoked', notes = CONCAT(COALESCE(notes, ''), '\nRevoked: ', ?)
       WHERE id = ?`,
      [reason || "No reason provided", certificateId]
    );

    if (result.affectedRows === 0) {
      throw new Error("Certificate not found");
    }

    return { message: "Certificate revoked successfully" };
  } finally {
    connection.release();
  }
};

// ============================================================================
// GET CERTIFICATE TEMPLATES
// ============================================================================

exports.getCertificateTemplates = async () => {
  const connection = await promisePool.getConnection();

  try {
    const [templates] = await connection.query(
      `SELECT * FROM certificate_templates
       WHERE status = 'active'
       ORDER BY is_default DESC, template_name ASC`
    );

    return { templates };
  } finally {
    connection.release();
  }
};

// ============================================================================
// SEARCH USERS FOR DROPDOWN
// ============================================================================

exports.searchUsers = async (search = "", limit = 20) => {
  const connection = await promisePool.getConnection();

  try {
    const searchPattern = `%${search}%`;

    const [users] = await connection.query(
      `SELECT
        u.uuid,
        COALESCE(s.first_name, i.first_name) as first_name,
        COALESCE(s.last_name, i.last_name) as last_name,
        u.email,
        u.role_id
       FROM users u
       LEFT JOIN students s ON u.uuid = s.user_id AND u.role_id = 1
       LEFT JOIN instructors i ON u.uuid = i.user_id AND u.role_id = 2
       WHERE (
         s.first_name LIKE ? OR s.last_name LIKE ? OR
         i.first_name LIKE ? OR i.last_name LIKE ? OR
         u.email LIKE ?
       )
       AND u.role_id IN (1, 2)
       AND u.is_deleted = 0
       ORDER BY first_name, last_name
       LIMIT ?`,
      [searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, limit]
    );

    return { users };
  } finally {
    connection.release();
  }
};

// ============================================================================
// GET USER CERTIFICATES (FOR STUDENT VIEW)
// ============================================================================

exports.getUserCertificates = async (userId) => {
  const connection = await promisePool.getConnection();

  try {
    const [certificates] = await connection.query(
      `SELECT
        aic.*,
        ct.template_name,
        CONCAT(COALESCE(issuer_s.first_name, issuer_i.first_name, issuer_a.first_name), ' ',
               COALESCE(issuer_s.last_name, issuer_i.last_name, issuer_a.last_name)) as issued_by_name
       FROM admin_issued_certificates aic
       LEFT JOIN certificate_templates ct ON aic.template_id = ct.id
       LEFT JOIN users issuer ON aic.issued_by = issuer.uuid
       LEFT JOIN students issuer_s ON issuer.uuid = issuer_s.user_id AND issuer.role_id = 1
       LEFT JOIN instructors issuer_i ON issuer.uuid = issuer_i.user_id AND issuer.role_id = 2
       LEFT JOIN admins issuer_a ON issuer.uuid = issuer_a.user_id AND issuer.role_id IN (3, 4)
       WHERE aic.user_id = ? AND aic.status = 'active'
       ORDER BY aic.issue_date DESC`,
      [userId]
    );

    return { certificates };
  } finally {
    connection.release();
  }
};
