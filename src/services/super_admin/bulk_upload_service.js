const { promisePool: pool } = require('../../config/db');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const { parseCSV } = require('../../utils/csv_parser');
const { generateTemporaryPassword } = require('../../utils/password_generator');
const emailHelper = require('../../utils/email_helper');
const {
  validateUserRow,
  validateContentRow,
  validateAssignmentRow,
  validateOrganizationRow,
  validateManagerLinks,
  isEmpty
} = require('../../utils/csv_validators');

// Canonical role-name → role_id mapping. Mirrors the `roles` table in the DB
// (1=student/learner, 2=instructor, 3=admin, 4=super_admin). super_admin is
// intentionally omitted — bulk uploads cannot mint super-admins.
const USER_ROLE_MAP = {
  learner: 1,
  student: 1, // back-compat alias
  instructor: 2,
  admin: 3
};

const ROLE_LABEL_FOR_INVITE = {
  1: 'Learner',
  2: 'Instructor',
  3: 'Admin'
};

// ==============================================
// UPLOAD USERS SERVICE
// ==============================================

exports.uploadUsers = async (fileBuffer, organizationId) => {
  const connection = await pool.getConnection();

  try {
    // Validate organization exists
    const [orgRows] = await connection.query(
      'SELECT id, name FROM organizations WHERE id = ? AND is_active = 1',
      [organizationId]
    );

    if (orgRows.length === 0) {
      return {
        success: false,
        message: 'Invalid or inactive organization',
        data: {
          totalRows: 0,
          validRows: 0,
          errorRows: 0,
          warnings: [],
          errors: [{ row: 0, field: 'organization', message: 'Organization not found or inactive' }],
          inserted: 0,
          skipped: 0
        }
      };
    }

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
      const validation = validateUserRow(row, i + 2); // +2 because row 1 is headers, and array is 0-indexed

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

    // Check for duplicate emails in CSV
    const emailsInCSV = csvData.map(row => row.email.toLowerCase().trim());
    const duplicateEmailsInCSV = emailsInCSV.filter((email, index) => emailsInCSV.indexOf(email) !== index);

    if (duplicateEmailsInCSV.length > 0) {
      duplicateEmailsInCSV.forEach(email => {
        const rowIndices = csvData
          .map((row, index) => row.email.toLowerCase().trim() === email ? index + 2 : -1)
          .filter(index => index !== -1);

        errors.push({
          row: rowIndices[1],
          field: 'email',
          message: `Duplicate email in CSV: ${email} (also in row ${rowIndices[0]})`
        });
      });

      skipped += duplicateEmailsInCSV.length;
    }

    // Check for existing emails in database
    const emailList = csvData.map(row => row.email.toLowerCase().trim());
    const [existingUsers] = await connection.query(
      'SELECT email FROM users WHERE email IN (?)',
      [emailList]
    );

    const existingEmails = new Set(existingUsers.map(u => u.email.toLowerCase()));

    // Manager-existence guard: reject any row whose manager_email isn't an
    // existing platform user OR a user defined earlier in this same CSV.
    // Pulling all platform emails (not just the ones in this CSV) so an
    // existing platform user can be referenced as a manager.
    const [allPlatformUsers] = await connection.query(
      'SELECT email FROM users WHERE is_deleted = 0'
    );
    const allPlatformEmailSet = new Set(
      allPlatformUsers.map(u => u.email.toLowerCase())
    );
    const managerLinkResult = validateManagerLinks(csvData, allPlatformEmailSet);
    if (managerLinkResult.errors.length > 0) {
      errors.push(...managerLinkResult.errors);
      // Each manager-link error invalidates that row.
      skipped += managerLinkResult.errors.length;
      return {
        success: false,
        message: `Manager-link validation failed for ${managerLinkResult.errors.length} row(s)`,
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

    // Start transaction
    await connection.beginTransaction();

    const invitationsToSend = [];
    // email → uuid map of users created in *this* CSV, used to wire the
    // manager link (`reports_to_uuid`) for rows whose manager appears
    // earlier in the same CSV.
    const newlyCreatedByEmail = new Map();

    try {
      for (let i = 0; i < csvData.length; i++) {
        const row = csvData[i];
        const email = row.email.toLowerCase().trim();

        // Skip if email already exists in database
        if (existingEmails.has(email)) {
          warnings.push(`Row ${i + 2}: Email already exists in system: ${email}`);
          skipped++;
          continue;
        }

        // Skip if duplicate in CSV
        if (duplicateEmailsInCSV.includes(email)) {
          skipped++;
          continue;
        }

        // Resolve role from CSV. Default to learner when role is missing for
        // back-compat with older templates that didn't include the column.
        const roleKey = isEmpty(row.role) ? 'learner' : String(row.role).toLowerCase().trim();
        const roleId = USER_ROLE_MAP[roleKey];
        if (!roleId) {
          warnings.push(`Row ${i + 2}: Invalid role: ${row.role}`);
          skipped++;
          continue;
        }

        // Generate a unique temporary password per user
        const tempPassword = generateTemporaryPassword();
        const hashedPassword = await bcrypt.hash(tempPassword, 10);

        // Create user
        const userId = uuidv4();

        // Insert into users table with the resolved role
        await connection.query(
          `INSERT INTO users (uuid, email, password, role_id, instance, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
          [userId, email, hashedPassword, roleId, 'default', 'active']
        );

        // Insert role-specific profile row
        if (roleId === 1) {
          await connection.query(
            `INSERT INTO students (user_id, first_name, last_name, contact)
             VALUES (?, ?, ?, ?)`,
            [userId, row.first_name, row.last_name, row.phone || null]
          );

          // Optional corporate metadata. Always written for learners since the
          // org-scoped flow expects it; harmless when fields are null.
          await connection.query(
            `INSERT INTO student_corporate_info
             (user_id, designation, department, location, manager_email)
             VALUES (?, ?, ?, ?, ?)`,
            [
              userId,
              row.job_title || null,
              row.department || null,
              row.location || null,
              row.manager_email || null
            ]
          );
        } else if (roleId === 2) {
          await connection.query(
            `INSERT INTO instructors (user_id, first_name, last_name, contact)
             VALUES (?, ?, ?, ?)`,
            [userId, row.first_name, row.last_name, row.phone || null]
          );
        } else if (roleId === 3) {
          await connection.query(
            `INSERT INTO admins (user_id, first_name, last_name, contact)
             VALUES (?, ?, ?, ?)`,
            [userId, row.first_name, row.last_name, row.phone || null]
          );
        }

        // Assign user to organization
        await connection.query(
          `INSERT INTO user_organizations (user_id, organization_id, assigned_at)
           VALUES (?, ?, NOW())`,
          [userId, organizationId]
        );

        // Wire the manager link if a manager email was provided. The validator
        // above guarantees the manager exists either in the DB or earlier in
        // this CSV, so this lookup either resolves immediately or finds the
        // manager in the in-flight map.
        if (!isEmpty(row.manager_email)) {
          const managerEmail = String(row.manager_email).toLowerCase().trim();
          let managerUuid = newlyCreatedByEmail.get(managerEmail) || null;
          if (!managerUuid) {
            const [mgrRows] = await connection.query(
              'SELECT uuid FROM users WHERE email = ? AND is_deleted = 0 LIMIT 1',
              [managerEmail]
            );
            managerUuid = mgrRows[0]?.uuid || null;
          }
          if (managerUuid) {
            await connection.query(
              'UPDATE users SET reports_to_uuid = ? WHERE uuid = ?',
              [managerUuid, userId]
            );
          }
        }

        newlyCreatedByEmail.set(email, userId);

        invitationsToSend.push({
          email,
          firstName: row.first_name,
          password: tempPassword,
          roleLabel: ROLE_LABEL_FOR_INVITE[roleId] || 'User'
        });

        inserted++;
      }

      // Commit transaction
      await connection.commit();
    } catch (error) {
      // Rollback transaction on error
      await connection.rollback();
      throw error;
    }

    // Send invitation emails after commit (best-effort — failures don't roll back inserted users)
    let emailsSent = 0;
    let emailsFailed = 0;
    if (invitationsToSend.length > 0) {
      const emailResults = await Promise.allSettled(
        invitationsToSend.map(inv =>
          emailHelper.sendInvitationEmail(inv.email, inv.firstName, {
            password: inv.password,
            roleLabel: inv.roleLabel
          })
        )
      );

      emailResults.forEach((result, idx) => {
        if (result.status === 'fulfilled') {
          emailsSent++;
        } else {
          emailsFailed++;
          console.error(`Invitation email failed for ${invitationsToSend[idx].email}:`, result.reason);
          warnings.push(`Invitation email failed for ${invitationsToSend[idx].email}`);
        }
      });
    }

    return {
      success: true,
      message: `Successfully uploaded ${inserted} user(s)`,
      data: {
        totalRows: csvData.length,
        validRows: inserted,
        errorRows: errors.length,
        warnings,
        errors,
        inserted,
        skipped,
        emailsSent,
        emailsFailed
      }
    };
  } catch (error) {
    console.error('Bulk upload users error:', error);
    throw error;
  } finally {
    connection.release();
  }
};

// ==============================================
// UPLOAD CONTENT UPDATES SERVICE
// ==============================================

exports.uploadContentUpdates = async (fileBuffer) => {
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
          updated: 0,
          skipped: 0
        }
      };
    }

    const errors = [];
    const warnings = [];
    let updated = 0;
    let skipped = 0;

    // Validate all rows first
    for (let i = 0; i < csvData.length; i++) {
      const row = csvData[i];
      const validation = validateContentRow(row, i + 2);

      if (!validation.valid) {
        errors.push(...validation.errors);
        skipped++;
      }
    }

    // If there are validation errors, return without updating
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
          updated: 0,
          skipped
        }
      };
    }

    // Start transaction
    await connection.beginTransaction();

    try {
      for (let i = 0; i < csvData.length; i++) {
        const row = csvData[i];
        const contentId = parseInt(row.content_id);
        const field = row.field.toLowerCase();
        const newValue = row.new_value;

        // Check if course exists
        const [courses] = await connection.query(
          'SELECT id FROM course WHERE id = ? AND is_deleted = 0',
          [contentId]
        );

        if (courses.length === 0) {
          warnings.push(`Row ${i + 2}: Course with ID ${contentId} not found`);
          skipped++;
          continue;
        }

        // Map field to database column
        const fieldMapping = {
          'title': 'title',
          'description': 'description',
          'status': 'status',
          'tags': 'tags',
          'course_duration': 'course_duration',
          'total_lessons': 'total_lessons'
        };

        let dbField = fieldMapping[field];
        let value = newValue;

        // Special handling for category (need to map name to ID)
        if (field === 'category') {
          const [categories] = await connection.query(
            'SELECT id FROM category WHERE category_name = ?',
            [newValue]
          );

          if (categories.length === 0) {
            warnings.push(`Row ${i + 2}: Category "${newValue}" not found`);
            skipped++;
            continue;
          }

          dbField = 'category_id';
          value = categories[0].id;
        }

        // Update course
        await connection.query(
          `UPDATE course SET ${dbField} = ?, updated_at = NOW() WHERE id = ?`,
          [value, contentId]
        );

        updated++;
      }

      // Commit transaction
      await connection.commit();

      return {
        success: true,
        message: `Successfully updated ${updated} course(s)`,
        data: {
          totalRows: csvData.length,
          validRows: updated,
          errorRows: errors.length,
          warnings,
          errors,
          updated,
          skipped
        }
      };
    } catch (error) {
      // Rollback transaction on error
      await connection.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Bulk upload content updates error:', error);
    throw error;
  } finally {
    connection.release();
  }
};

// ==============================================
// UPLOAD ASSIGNMENTS SERVICE
// ==============================================

exports.uploadAssignments = async (fileBuffer) => {
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

    const errors = [];
    const warnings = [];
    let inserted = 0;
    let skipped = 0;

    // Validate all rows first
    for (let i = 0; i < csvData.length; i++) {
      const row = csvData[i];
      const validation = validateAssignmentRow(row, i + 2);

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

    // Start transaction
    await connection.beginTransaction();

    try {
      for (let i = 0; i < csvData.length; i++) {
        const row = csvData[i];
        const userEmail = row.user_email.toLowerCase().trim();

        // Lookup user by email
        const [users] = await connection.query(
          'SELECT uuid FROM users WHERE email = ? AND is_deleted = 0',
          [userEmail]
        );

        if (users.length === 0) {
          warnings.push(`Row ${i + 2}: User with email ${userEmail} not found`);
          skipped++;
          continue;
        }

        const userId = users[0].uuid;
        let courseId = null;

        // Lookup course by ID or name
        if (!isEmpty(row.course_id)) {
          const [courses] = await connection.query(
            'SELECT id FROM course WHERE id = ? AND is_deleted = 0',
            [parseInt(row.course_id)]
          );

          if (courses.length === 0) {
            warnings.push(`Row ${i + 2}: Course with ID ${row.course_id} not found`);
            skipped++;
            continue;
          }

          courseId = courses[0].id;
        } else if (!isEmpty(row.course_name)) {
          const [courses] = await connection.query(
            'SELECT id FROM course WHERE title = ? AND is_deleted = 0',
            [row.course_name]
          );

          if (courses.length === 0) {
            warnings.push(`Row ${i + 2}: Course with name "${row.course_name}" not found`);
            skipped++;
            continue;
          }

          courseId = courses[0].id;
        }

        // Check for duplicate enrollment
        const [existing] = await connection.query(
          'SELECT id FROM enrol WHERE user_id = ? AND course_id = ?',
          [userId, courseId]
        );

        if (existing.length > 0) {
          warnings.push(`Row ${i + 2}: User already enrolled in this course`);
          skipped++;
          continue;
        }

        // Insert enrollment
        await connection.query(
          'INSERT INTO enrol (user_id, course_id, enrolled_date) VALUES (?, ?, NOW())',
          [userId, courseId]
        );

        inserted++;

        // TODO: Send notification if requested (requires notification service)
        // if (!isEmpty(row.send_notification) && row.send_notification.toLowerCase() === 'yes') {
        //   // Send notification
        // }
      }

      // Commit transaction
      await connection.commit();

      return {
        success: true,
        message: `Successfully enrolled ${inserted} user(s)`,
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
    console.error('Bulk upload assignments error:', error);
    throw error;
  } finally {
    connection.release();
  }
};
