const { promisePool: pool } = require('../../config/db');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const { parseCSV } = require('../../utils/csv_parser');
const { generateTemporaryPassword } = require('../../utils/password_generator');
const emailHelper = require('../../utils/email_helper');
const { ROLE_LABELS } = require('../../utils/invitation_helper');
const {
  validateUserRow,
  validateContentRow,
  validateAssignmentRow,
  isEmpty
} = require('../../utils/csv_validators');

// ==============================================
// UPLOAD USERS SERVICE
// ==============================================

exports.uploadUsers = async (fileBuffer) => {
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

    // Start transaction
    await connection.beginTransaction();

    const invitationsToSend = [];

    try {
      // Role mapping
      const roleMap = {
        'student': 1,
        'admin': 2,
        'instructor': 3,
        'super_admin': 4
      };

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

        // Get role_id from role name
        const roleKey = row.role.toLowerCase();
        const roleId = roleMap[roleKey];
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

        // Insert into users table
        await connection.query(
          `INSERT INTO users (uuid, email, password, role_id, instance, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
          [userId, email, hashedPassword, roleId, 'default', 'active']
        );

        // Insert into role-specific table
        if (roleId === 1) {
          // Student
          await connection.query(
            `INSERT INTO students (user_id, first_name, last_name, contact)
             VALUES (?, ?, ?, ?)`,
            [userId, row.first_name, row.last_name, row.phone || null]
          );

          // Insert into student_corporate_info table if job-related fields provided
          if (row.job_title || row.department || row.location || row.manager_email) {
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
          }
        } else if (roleId === 2) {
          // Admin
          await connection.query(
            `INSERT INTO admins (user_id, first_name, last_name, contact)
             VALUES (?, ?, ?, ?)`,
            [userId, row.first_name, row.last_name, row.phone || null]
          );
        } else if (roleId === 3) {
          // Instructor
          await connection.query(
            `INSERT INTO instructors (user_id, first_name, last_name, contact)
             VALUES (?, ?, ?, ?)`,
            [userId, row.first_name, row.last_name, row.phone || null]
          );
        } else if (roleId === 4) {
          // Super Admin
          await connection.query(
            `INSERT INTO super_admins (user_id, first_name, last_name, contact)
             VALUES (?, ?, ?, ?)`,
            [userId, row.first_name, row.last_name, row.phone || null]
          );
        }

        // Handle organization assignment (optional)
        if (!isEmpty(row.organization_id) || !isEmpty(row.organization_name)) {
          let organizationId = null;

          // Get organization ID
          if (!isEmpty(row.organization_id)) {
            organizationId = parseInt(row.organization_id);
          } else if (!isEmpty(row.organization_name)) {
            // Look up organization by name
            const [orgResults] = await connection.query(
              'SELECT id, is_active FROM organizations WHERE name = ?',
              [row.organization_name.trim()]
            );

            if (orgResults.length === 0) {
              warnings.push(`Row ${i + 2}: Organization "${row.organization_name}" not found`);
            } else if (orgResults[0].is_active === 0) {
              warnings.push(`Row ${i + 2}: Organization "${row.organization_name}" is inactive`);
            } else {
              organizationId = orgResults[0].id;
            }
          }

          // Assign to organization if valid
          if (organizationId) {
            // Verify organization exists and is active
            const [orgCheck] = await connection.query(
              'SELECT id, is_active FROM organizations WHERE id = ?',
              [organizationId]
            );

            if (orgCheck.length === 0) {
              warnings.push(`Row ${i + 2}: Organization with ID ${organizationId} not found`);
            } else if (orgCheck[0].is_active === 0) {
              warnings.push(`Row ${i + 2}: Organization with ID ${organizationId} is inactive`);
            } else {
              // Note: For bulk upload, we enforce one organization per student/instructor
              // Admins can have multiple organizations but we only assign one here
              try {
                await connection.query(
                  'INSERT INTO user_organizations (user_id, organization_id) VALUES (?, ?)',
                  [userId, organizationId]
                );
              } catch (orgError) {
                warnings.push(`Row ${i + 2}: Failed to assign organization: ${orgError.message}`);
              }
            }
          }
        }

        invitationsToSend.push({
          email,
          firstName: row.first_name,
          password: tempPassword,
          roleLabel: ROLE_LABELS[roleKey] || 'User'
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
