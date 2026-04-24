const { promisePool: pool } = require('../../config/db');
const { parseCSV } = require('../../utils/csv_parser');
const { validateOrganizationRow, isEmpty } = require('../../utils/csv_validators');

/**
 * Organization Service
 * Handles all business logic for organization management
 */

/**
 * Get all organizations with optional filters
 */
const getAllOrganizations = async (filters = {}) => {
  try {
    const { search, isActive, page = 1, limit = 10 } = filters;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Build WHERE clauses
    let whereConditions = ['1=1'];
    let queryParams = [];

    // Search filter
    if (search && search !== '') {
      whereConditions.push('name LIKE ?');
      queryParams.push(`%${search}%`);
    }

    // Active status filter
    if (isActive !== undefined && isActive !== null && isActive !== '') {
      whereConditions.push('is_active = ?');
      queryParams.push(isActive === 'true' || isActive === true || isActive === 1 ? 1 : 0);
    }

    const whereClause = whereConditions.join(' AND ');

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total_count
      FROM organizations
      WHERE ${whereClause}
    `;

    const [countResult] = await pool.query(countQuery, queryParams);
    const totalCount = countResult[0]?.total_count || 0;

    // Get paginated organizations with user count (only active and not deleted users)
    const orgsQuery = `
      SELECT
        o.id,
        o.name,
        o.is_active as isActive,
        o.created_at as createdAt,
        o.updated_at as updatedAt,
        COALESCE(user_count.total, 0) as userCount
      FROM organizations o
      LEFT JOIN (
        SELECT uo.organization_id, COUNT(*) as total
        FROM user_organizations uo
        INNER JOIN users u ON uo.user_id = u.uuid
        WHERE (u.is_deleted IS NULL OR u.is_deleted = 0)
          AND u.status = 'active'
        GROUP BY uo.organization_id
      ) user_count ON o.id = user_count.organization_id
      WHERE ${whereClause}
      ORDER BY o.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const [organizations] = await pool.query(orgsQuery, [...queryParams, parseInt(limit), offset]);

    return {
      organizations,
      pagination: {
        total: totalCount,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(totalCount / parseInt(limit))
      }
    };
  } catch (error) {
    console.error('OrganizationService - getAllOrganizations error:', error);
    throw error;
  }
};

/**
 * Get organization by ID with user details (only active and not deleted users)
 */
const getOrganizationById = async (id) => {
  try {
    const orgQuery = `
      SELECT
        o.id,
        o.name,
        o.is_active as isActive,
        o.created_at as createdAt,
        o.updated_at as updatedAt,
        COALESCE(user_count.total, 0) as userCount
      FROM organizations o
      LEFT JOIN (
        SELECT uo.organization_id, COUNT(*) as total
        FROM user_organizations uo
        INNER JOIN users u ON uo.user_id = u.uuid
        WHERE (u.is_deleted IS NULL OR u.is_deleted = 0)
          AND u.status = 'active'
        GROUP BY uo.organization_id
      ) user_count ON o.id = user_count.organization_id
      WHERE o.id = ?
    `;

    const [rows] = await pool.query(orgQuery, [id]);

    if (rows.length === 0) {
      return null;
    }

    return rows[0];
  } catch (error) {
    console.error('OrganizationService - getOrganizationById error:', error);
    throw error;
  }
};

/**
 * Create a new organization
 */
const createOrganization = async (data) => {
  try {
    const { name, isActive = true } = data;

    // Check if organization name already exists
    const [existing] = await pool.query(
      'SELECT id FROM organizations WHERE name = ?',
      [name]
    );

    if (existing.length > 0) {
      return {
        success: false,
        message: 'Organization with this name already exists'
      };
    }

    // Insert new organization
    const [result] = await pool.query(
      'INSERT INTO organizations (name, is_active) VALUES (?, ?)',
      [name, isActive ? 1 : 0]
    );

    return {
      success: true,
      message: 'Organization created successfully',
      data: {
        id: result.insertId
      }
    };
  } catch (error) {
    console.error('OrganizationService - createOrganization error:', error);
    throw error;
  }
};

/**
 * Update an organization
 */
const updateOrganization = async (id, data) => {
  try {
    const { name, isActive } = data;

    // Check if organization exists
    const org = await getOrganizationById(id);
    if (!org) {
      return {
        success: false,
        message: 'Organization not found'
      };
    }

    // Check if new name conflicts with another organization
    if (name && name !== org.name) {
      const [existing] = await pool.query(
        'SELECT id FROM organizations WHERE name = ? AND id != ?',
        [name, id]
      );

      if (existing.length > 0) {
        return {
          success: false,
          message: 'Organization with this name already exists'
        };
      }
    }

    // Build update query dynamically
    const updates = [];
    const values = [];

    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }

    if (isActive !== undefined) {
      updates.push('is_active = ?');
      values.push(isActive ? 1 : 0);
    }

    if (updates.length === 0) {
      return {
        success: false,
        message: 'No fields to update'
      };
    }

    values.push(id);

    await pool.query(
      `UPDATE organizations SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    return {
      success: true,
      message: 'Organization updated successfully'
    };
  } catch (error) {
    console.error('OrganizationService - updateOrganization error:', error);
    throw error;
  }
};

/**
 * Delete an organization (with cascade delete of user assignments)
 */
const deleteOrganization = async (id) => {
  try {
    // Check if organization exists
    const org = await getOrganizationById(id);
    if (!org) {
      return {
        success: false,
        message: 'Organization not found'
      };
    }

    // Delete organization (CASCADE will delete user_organizations entries)
    const [result] = await pool.query(
      'DELETE FROM organizations WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return {
        success: false,
        message: 'Failed to delete organization'
      };
    }

    return {
      success: true,
      message: 'Organization deleted successfully'
    };
  } catch (error) {
    console.error('OrganizationService - deleteOrganization error:', error);
    throw error;
  }
};

/**
 * Toggle organization active status
 */
const toggleOrganizationStatus = async (id, isActive) => {
  try {
    const [result] = await pool.query(
      'UPDATE organizations SET is_active = ? WHERE id = ?',
      [isActive ? 1 : 0, id]
    );

    if (result.affectedRows === 0) {
      return {
        success: false,
        message: 'Organization not found'
      };
    }

    return {
      success: true,
      message: `Organization ${isActive ? 'activated' : 'deactivated'} successfully`
    };
  } catch (error) {
    console.error('OrganizationService - toggleOrganizationStatus error:', error);
    throw error;
  }
};

/**
 * Get users in an organization
 */
const getOrganizationUsers = async (organizationId, filters = {}) => {
  try {
    const { page = 1, limit = 10, search = '' } = filters;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Build search condition
    let searchCondition = '';
    let queryParams = [organizationId];

    if (search && search.trim() !== '') {
      searchCondition = `
        AND (
          profile.first_name LIKE ? OR
          profile.last_name LIKE ? OR
          u.email LIKE ? OR
          CASE u.role_id
            WHEN 1 THEN 'student'
            WHEN 2 THEN 'instructor'
            WHEN 3 THEN 'admin'
            WHEN 4 THEN 'super_admin'
          END LIKE ?
        )
      `;
      const searchTerm = `%${search.trim()}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    // Get total count (only active and not deleted users)
    const countQuery = `
      SELECT COUNT(*) as total_count
      FROM user_organizations uo
      INNER JOIN users u ON uo.user_id = u.uuid
      LEFT JOIN (
        SELECT user_id, first_name, last_name FROM students
        UNION ALL
        SELECT user_id, first_name, last_name FROM instructors
        UNION ALL
        SELECT user_id, first_name, last_name FROM admins
      ) profile ON u.uuid = profile.user_id
      WHERE uo.organization_id = ?
        AND (u.is_deleted IS NULL OR u.is_deleted = 0)
        AND u.status = 'active'
        ${searchCondition}
    `;
    const [countResult] = await pool.query(countQuery, queryParams);
    const totalCount = countResult[0]?.total_count || 0;

    // Get users (only active and not deleted)
    const usersQuery = `
      SELECT
        u.uuid as id,
        u.uuid,
        profile.first_name as firstName,
        profile.last_name as lastName,
        u.email,
        CASE u.role_id
          WHEN 1 THEN 'student'
          WHEN 2 THEN 'instructor'
          WHEN 3 THEN 'admin'
          WHEN 4 THEN 'super_admin'
        END as role,
        u.role_id as roleId,
        uo.assigned_at as assignedAt
      FROM user_organizations uo
      INNER JOIN users u ON uo.user_id = u.uuid
      LEFT JOIN (
        SELECT user_id, first_name, last_name FROM students
        UNION ALL
        SELECT user_id, first_name, last_name FROM instructors
        UNION ALL
        SELECT user_id, first_name, last_name FROM admins
      ) profile ON u.uuid = profile.user_id
      WHERE uo.organization_id = ?
        AND (u.is_deleted IS NULL OR u.is_deleted = 0)
        AND u.status = 'active'
        ${searchCondition}
      ORDER BY uo.assigned_at DESC
      LIMIT ? OFFSET ?
    `;

    const [users] = await pool.query(usersQuery, [...queryParams, parseInt(limit), offset]);

    return {
      users,
      pagination: {
        total: totalCount,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(totalCount / parseInt(limit))
      }
    };
  } catch (error) {
    console.error('OrganizationService - getOrganizationUsers error:', error);
    throw error;
  }
};

/**
 * Get all active users (not deleted, status = active)
 * This is used for assigning users to organizations
 * Excludes Super Admin users (only returns Students, Admins, and Instructors)
 */
const getAllActiveUsers = async () => {
  try {
    const query = `
      SELECT DISTINCT
        u.uuid as id,
        u.uuid,
        profile.first_name as firstName,
        profile.last_name as lastName,
        u.email,
        CASE u.role_id
          WHEN 1 THEN 'Student'
          WHEN 2 THEN 'Instructor'
          WHEN 3 THEN 'Admin'
        END as role,
        u.role_id as roleId
      FROM users u
      LEFT JOIN (
        SELECT user_id, first_name, last_name FROM students
        UNION
        SELECT user_id, first_name, last_name FROM admins
        UNION
        SELECT user_id, first_name, last_name FROM instructors
      ) profile ON u.uuid = profile.user_id
      WHERE (u.is_deleted IS NULL OR u.is_deleted = 0)
        AND u.status = 'active'
        AND u.role_id IN (1, 2, 3)
      ORDER BY profile.first_name, profile.last_name, u.email
    `;

    const [users] = await pool.query(query);
    return users;
  } catch (error) {
    console.error('OrganizationService - getAllActiveUsers error:', error);
    throw error;
  }
};

/**
 * Assign user to organization
 */
const assignUserToOrganization = async (userId, organizationId) => {
  try {
    // Get user role
    const [userRows] = await pool.query(
      'SELECT role_id FROM users WHERE uuid = ?',
      [userId]
    );

    if (userRows.length === 0) {
      return {
        success: false,
        message: 'User not found'
      };
    }

    const roleId = userRows[0].role_id;

    // For students and instructors (role_id 1 and 2), check if they already have an organization
    if (roleId === 1 || roleId === 2) {
      const [existing] = await pool.query(
        'SELECT id FROM user_organizations WHERE user_id = ?',
        [userId]
      );

      if (existing.length > 0) {
        return {
          success: false,
          message: 'Students and instructors can only belong to one organization. Please remove current organization first.'
        };
      }
    }

    // Check if already assigned to this organization
    const [alreadyAssigned] = await pool.query(
      'SELECT id FROM user_organizations WHERE user_id = ? AND organization_id = ?',
      [userId, organizationId]
    );

    if (alreadyAssigned.length > 0) {
      return {
        success: false,
        message: 'User is already assigned to this organization'
      };
    }

    // Assign user to organization
    await pool.query(
      'INSERT INTO user_organizations (user_id, organization_id) VALUES (?, ?)',
      [userId, organizationId]
    );

    return {
      success: true,
      message: 'User assigned to organization successfully'
    };
  } catch (error) {
    console.error('OrganizationService - assignUserToOrganization error:', error);
    throw error;
  }
};

/**
 * Bulk assign users to organization
 */
const bulkAssignUsersToOrganization = async (userIds, organizationId) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const results = {
      success: [],
      failed: [],
      skipped: []
    };

    for (const userId of userIds) {
      try {
        // Get user role
        const [userRows] = await connection.query(
          'SELECT role_id FROM users WHERE uuid = ?',
          [userId]
        );

        if (userRows.length === 0) {
          results.failed.push({ userId, reason: 'User not found' });
          continue;
        }

        const roleId = userRows[0].role_id;

        // For students and instructors (role_id 1 and 2), check if they already have an organization
        if (roleId === 1 || roleId === 2) {
          const [existing] = await connection.query(
            'SELECT id FROM user_organizations WHERE user_id = ?',
            [userId]
          );

          if (existing.length > 0) {
            results.skipped.push({ userId, reason: 'User already belongs to another organization' });
            continue;
          }
        }

        // Check if already assigned to this organization
        const [alreadyAssigned] = await connection.query(
          'SELECT id FROM user_organizations WHERE user_id = ? AND organization_id = ?',
          [userId, organizationId]
        );

        if (alreadyAssigned.length > 0) {
          results.skipped.push({ userId, reason: 'Already assigned to this organization' });
          continue;
        }

        // Assign user to organization
        await connection.query(
          'INSERT INTO user_organizations (user_id, organization_id) VALUES (?, ?)',
          [userId, organizationId]
        );

        results.success.push(userId);
      } catch (error) {
        console.error(`Error assigning user ${userId}:`, error);
        results.failed.push({ userId, reason: error.message });
      }
    }

    await connection.commit();

    return {
      success: true,
      message: `Assigned ${results.success.length} user(s) successfully`,
      data: {
        successCount: results.success.length,
        failedCount: results.failed.length,
        skippedCount: results.skipped.length,
        details: results
      }
    };
  } catch (error) {
    await connection.rollback();
    console.error('OrganizationService - bulkAssignUsersToOrganization error:', error);
    throw error;
  } finally {
    connection.release();
  }
};

/**
 * Remove user from organization
 */
const removeUserFromOrganization = async (userId, organizationId) => {
  try {
    const [result] = await pool.query(
      'DELETE FROM user_organizations WHERE user_id = ? AND organization_id = ?',
      [userId, organizationId]
    );

    if (result.affectedRows === 0) {
      return {
        success: false,
        message: 'User is not assigned to this organization'
      };
    }

    return {
      success: true,
      message: 'User removed from organization successfully'
    };
  } catch (error) {
    console.error('OrganizationService - removeUserFromOrganization error:', error);
    throw error;
  }
};

/**
 * Get user's organizations
 */
const getUserOrganizations = async (userId) => {
  try {
    const query = `
      SELECT
        o.id,
        o.name,
        o.is_active as isActive,
        o.created_at as createdAt,
        o.updated_at as updatedAt,
        uo.assigned_at as assignedAt
      FROM user_organizations uo
      INNER JOIN organizations o ON uo.organization_id = o.id
      WHERE uo.user_id = ?
      ORDER BY uo.assigned_at DESC
    `;

    const [organizations] = await pool.query(query, [userId]);
    return organizations;
  } catch (error) {
    console.error('OrganizationService - getUserOrganizations error:', error);
    throw error;
  }
};

/**
 * Bulk upload organizations from CSV
 */
const bulkUploadOrganizations = async (fileBuffer) => {
  const connection = await pool.getConnection();

  try {
    // Parse CSV
    const csvData = await parseCSV(fileBuffer);

    if (csvData.length === 0) {
      return {
        success: false,
        message: 'CSV file is empty',
        data: {
          totalRows: 0,
          validRows: 0,
          errorRows: 0,
          warnings: [],
          errors: [],
          inserted: 0,
          skipped: 0
        }
      };
    }

    // Enforce max 1000 rows
    if (csvData.length > 1000) {
      return {
        success: false,
        message: 'CSV file exceeds maximum 1000 rows',
        data: {
          totalRows: csvData.length,
          validRows: 0,
          errorRows: csvData.length,
          warnings: [],
          errors: [{ row: 0, field: 'file', message: 'Maximum 1000 rows allowed' }],
          inserted: 0,
          skipped: csvData.length
        }
      };
    }

    const errors = [];
    const warnings = [];
    let inserted = 0;
    let skipped = 0;

    // Validate all rows first
    for (let i = 0; i < csvData.length; i++) {
      const row = csvData[i];
      const validation = validateOrganizationRow(row, i + 2); // +2 because row 1 is headers, and array is 0-indexed

      if (!validation.valid) {
        errors.push(...validation.errors);
        skipped++;
      }
    }

    // If there are validation errors, return without inserting
    if (errors.length > 0) {
      return {
        success: false,
        message: `Validation failed for ${errors.length} row(s)`,
        data: {
          totalRows: csvData.length,
          validRows: csvData.length - skipped,
          errorRows: skipped,
          warnings,
          errors,
          inserted: 0,
          skipped
        }
      };
    }

    // Check for duplicate names in CSV
    const namesInCSV = csvData.map(row => row.name.toLowerCase().trim());
    const duplicateNamesInCSV = namesInCSV.filter((name, index) => namesInCSV.indexOf(name) !== index);

    if (duplicateNamesInCSV.length > 0) {
      duplicateNamesInCSV.forEach(name => {
        const rowIndices = csvData
          .map((row, index) => row.name.toLowerCase().trim() === name ? index + 2 : -1)
          .filter(index => index !== -1);

        errors.push({
          row: rowIndices[1],
          field: 'name',
          message: `Duplicate organization name in CSV: ${name} (also in row ${rowIndices[0]})`
        });
      });

      skipped += duplicateNamesInCSV.length;
    }

    // Check for existing organization names in database
    const nameList = csvData.map(row => row.name.toLowerCase().trim());
    const [existingOrgs] = await connection.query(
      'SELECT name FROM organizations WHERE LOWER(name) IN (?)',
      [nameList]
    );

    const existingNames = new Set(existingOrgs.map(org => org.name.toLowerCase()));

    // Start transaction
    await connection.beginTransaction();

    try {
      for (let i = 0; i < csvData.length; i++) {
        const row = csvData[i];
        const name = row.name.trim();
        const nameLower = name.toLowerCase();

        // Skip if organization name already exists in database
        if (existingNames.has(nameLower)) {
          warnings.push(`Row ${i + 2}: Organization name already exists in system: ${name}`);
          skipped++;
          continue;
        }

        // Skip if duplicate in CSV
        if (duplicateNamesInCSV.includes(nameLower)) {
          skipped++;
          continue;
        }

        // Determine is_active status (default to true/1 if not provided)
        let isActive = 1; // Default to active
        if (!isEmpty(row.is_active)) {
          const statusValue = row.is_active.toLowerCase().trim();
          isActive = ['yes', 'y', 'true', '1'].includes(statusValue) ? 1 : 0;
        }

        // Insert into organizations table
        await connection.query(
          `INSERT INTO organizations (name, is_active, created_at, updated_at)
           VALUES (?, ?, NOW(), NOW())`,
          [name, isActive]
        );

        inserted++;
      }

      // Commit transaction
      await connection.commit();

      return {
        success: true,
        message: `Successfully uploaded ${inserted} organization(s)`,
        data: {
          totalRows: csvData.length,
          validRows: inserted,
          errorRows: errors.length,
          warnings,
          errors,
          inserted,
          skipped
        }
      };
    } catch (error) {
      // Rollback transaction on error
      await connection.rollback();
      throw error;
    }
  } catch (error) {
    console.error('OrganizationService - bulkUploadOrganizations error:', error);
    throw error;
  } finally {
    connection.release();
  }
};

module.exports = {
  getAllOrganizations,
  getOrganizationById,
  createOrganization,
  updateOrganization,
  deleteOrganization,
  toggleOrganizationStatus,
  getOrganizationUsers,
  getAllActiveUsers,
  assignUserToOrganization,
  bulkAssignUsersToOrganization,
  removeUserFromOrganization,
  getUserOrganizations,
  bulkUploadOrganizations
};
