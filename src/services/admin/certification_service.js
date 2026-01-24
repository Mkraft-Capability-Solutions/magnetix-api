const { promisePool } = require("../../config/db");

class CertificationService {
  // ============================================================================
  // CREATE CERTIFICATION
  // ============================================================================

  async createCertification(certificationData, createdBy) {
    const connection = await promisePool.getConnection();

    try {
      await connection.beginTransaction();

      const {
        certification_name,
        description,
        validity_period,
        validity_type,
        template_file_path,
        status,
        course_ids, // Array of course IDs
      } = certificationData;

      // Insert certification
      const [result] = await connection.query(
        `INSERT INTO certifications
        (certification_name, description, validity_period, validity_type, template_file_path, status, created_by, updated_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          certification_name,
          description || null,
          validity_period || null,
          validity_type || 'lifetime',
          template_file_path || null,
          status || 'active',
          createdBy,
          createdBy,
        ]
      );

      const certificationId = result.insertId;

      // Insert course requirements if provided
      if (course_ids && Array.isArray(course_ids) && course_ids.length > 0) {
        for (const courseId of course_ids) {
          await connection.query(
            `INSERT INTO certification_course_requirements (certification_id, course_id)
            VALUES (?, ?)`,
            [certificationId, courseId]
          );
        }
      }

      await connection.commit();

      return {
        success: true,
        certificationId,
        message: "Certification created successfully",
      };
    } catch (error) {
      await connection.rollback();
      console.error("Error in createCertification:", error);
      throw error;
    } finally {
      connection.release();
    }
  }

  // ============================================================================
  // GET ALL CERTIFICATIONS (WITH PAGINATION)
  // ============================================================================

  async getAllCertifications(page = 1, limit = 10, status = null, search = null) {
    try {
      const offset = (page - 1) * limit;

      let whereConditions = [];
      let params = [];

      // Filter by status
      if (status && status !== 'all') {
        whereConditions.push('c.status = ?');
        params.push(status);
      }

      // Search by certification name
      if (search && search.trim()) {
        whereConditions.push('c.certification_name LIKE ?');
        params.push(`%${search}%`);
      }

      const whereClause = whereConditions.length > 0
        ? 'WHERE ' + whereConditions.join(' AND ')
        : '';

      // Get total count
      const [countResult] = await promisePool.query(
        `SELECT COUNT(*) as total FROM certifications c ${whereClause}`,
        params
      );

      const totalCount = countResult[0].total;

      // Get certifications with course count
      const [certifications] = await promisePool.query(
        `SELECT
          c.id,
          c.certification_name,
          c.description,
          c.validity_period,
          c.validity_type,
          c.template_file_path,
          c.status,
          c.created_at,
          c.updated_at,
          COUNT(DISTINCT ccr.course_id) as required_courses_count,
          a.first_name as created_by_name,
          a.last_name as created_by_lastname
        FROM certifications c
        LEFT JOIN certification_course_requirements ccr ON c.id = ccr.certification_id
        LEFT JOIN admins a ON c.created_by = a.user_id
        ${whereClause}
        GROUP BY c.id
        ORDER BY c.created_at DESC
        LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );

      return {
        success: true,
        data: certifications,
        pagination: {
          total: totalCount,
          page: page,
          limit: limit,
          totalPages: Math.ceil(totalCount / limit),
        },
      };
    } catch (error) {
      console.error("Error in getAllCertifications:", error);
      throw error;
    }
  }

  // ============================================================================
  // GET CERTIFICATION BY ID (WITH COURSE DETAILS)
  // ============================================================================

  async getCertificationById(certificationId) {
    try {
      // Get certification details
      const [certificationRows] = await promisePool.query(
        `SELECT
          c.*,
          a.first_name as created_by_name,
          a.last_name as created_by_lastname
        FROM certifications c
        LEFT JOIN admins a ON c.created_by = a.user_id
        WHERE c.id = ?`,
        [certificationId]
      );

      if (certificationRows.length === 0) {
        throw new Error("Certification not found");
      }

      const certification = certificationRows[0];

      // Get required courses
      const [courses] = await promisePool.query(
        `SELECT
          ccr.id as requirement_id,
          ccr.course_id,
          c.title as course_title,
          c.short_description,
          c.thumbnail,
          c.course_duration,
          c.level,
          c.status as course_status,
          cat.category_name,
          sc.subcategory_name
        FROM certification_course_requirements ccr
        JOIN course c ON ccr.course_id = c.id
        LEFT JOIN category cat ON c.category_id = cat.id
        LEFT JOIN sub_category sc ON c.sub_category_id = sc.id
        WHERE ccr.certification_id = ?
        ORDER BY c.title ASC`,
        [certificationId]
      );

      return {
        success: true,
        data: {
          ...certification,
          required_courses: courses,
        },
      };
    } catch (error) {
      console.error("Error in getCertificationById:", error);
      throw error;
    }
  }

  // ============================================================================
  // UPDATE CERTIFICATION
  // ============================================================================

  async updateCertification(certificationId, certificationData, updatedBy) {
    const connection = await promisePool.getConnection();

    try {
      await connection.beginTransaction();

      const {
        certification_name,
        description,
        validity_period,
        validity_type,
        template_file_path,
        status,
        course_ids,
      } = certificationData;

      // Update certification
      const [result] = await connection.query(
        `UPDATE certifications SET
          certification_name = ?,
          description = ?,
          validity_period = ?,
          validity_type = ?,
          template_file_path = ?,
          status = ?,
          updated_by = ?,
          updated_at = NOW()
        WHERE id = ?`,
        [
          certification_name,
          description || null,
          validity_period || null,
          validity_type || 'lifetime',
          template_file_path || null,
          status || 'active',
          updatedBy,
          certificationId,
        ]
      );

      if (result.affectedRows === 0) {
        throw new Error("Certification not found");
      }

      // Update course requirements if provided
      if (course_ids !== undefined) {
        // Delete existing requirements
        await connection.query(
          `DELETE FROM certification_course_requirements WHERE certification_id = ?`,
          [certificationId]
        );

        // Insert new requirements
        if (Array.isArray(course_ids) && course_ids.length > 0) {
          for (const courseId of course_ids) {
            await connection.query(
              `INSERT INTO certification_course_requirements (certification_id, course_id)
              VALUES (?, ?)`,
              [certificationId, courseId]
            );
          }
        }
      }

      await connection.commit();

      return {
        success: true,
        message: "Certification updated successfully",
      };
    } catch (error) {
      await connection.rollback();
      console.error("Error in updateCertification:", error);
      throw error;
    } finally {
      connection.release();
    }
  }

  // ============================================================================
  // DELETE CERTIFICATION
  // ============================================================================

  async deleteCertification(certificationId) {
    const connection = await promisePool.getConnection();

    try {
      await connection.beginTransaction();

      // Delete course requirements first (due to foreign key)
      await connection.query(
        `DELETE FROM certification_course_requirements WHERE certification_id = ?`,
        [certificationId]
      );

      // Delete certification
      const [result] = await connection.query(
        `DELETE FROM certifications WHERE id = ?`,
        [certificationId]
      );

      if (result.affectedRows === 0) {
        throw new Error("Certification not found");
      }

      await connection.commit();

      return {
        success: true,
        message: "Certification deleted successfully",
      };
    } catch (error) {
      await connection.rollback();
      console.error("Error in deleteCertification:", error);
      throw error;
    } finally {
      connection.release();
    }
  }

  // ============================================================================
  // GET ACTIVE COURSES (FOR DROPDOWN IN CREATE/EDIT)
  // ============================================================================

  async getActiveCourses() {
    try {
      const [courses] = await promisePool.query(
        `SELECT
          c.id,
          c.title,
          c.short_description,
          c.thumbnail,
          c.course_duration,
          c.level,
          cat.category_name,
          sc.subcategory_name
        FROM course c
        LEFT JOIN category cat ON c.category_id = cat.id
        LEFT JOIN sub_category sc ON c.sub_category_id = sc.id
        WHERE c.status = 'active' AND c.is_deleted = 0
        ORDER BY c.title ASC`
      );

      return {
        success: true,
        data: courses,
      };
    } catch (error) {
      console.error("Error in getActiveCourses:", error);
      throw error;
    }
  }

  // ============================================================================
  // TOGGLE CERTIFICATION STATUS
  // ============================================================================

  async toggleCertificationStatus(certificationId, updatedBy) {
    try {
      const [result] = await promisePool.query(
        `UPDATE certifications SET
          status = CASE
            WHEN status = 'active' THEN 'inactive'
            WHEN status = 'inactive' THEN 'active'
            ELSE status
          END,
          updated_by = ?,
          updated_at = NOW()
        WHERE id = ?`,
        [updatedBy, certificationId]
      );

      if (result.affectedRows === 0) {
        throw new Error("Certification not found");
      }

      // Get updated status
      const [certification] = await promisePool.query(
        `SELECT status FROM certifications WHERE id = ?`,
        [certificationId]
      );

      return {
        success: true,
        status: certification[0].status,
        message: `Certification ${certification[0].status === 'active' ? 'activated' : 'deactivated'} successfully`,
      };
    } catch (error) {
      console.error("Error in toggleCertificationStatus:", error);
      throw error;
    }
  }

  // ============================================================================
  // ADD COURSE TO CERTIFICATION
  // ============================================================================

  async addCourseRequirement(certificationId, courseId) {
    try {
      // Check if already exists
      const [existing] = await promisePool.query(
        `SELECT id FROM certification_course_requirements
        WHERE certification_id = ? AND course_id = ?`,
        [certificationId, courseId]
      );

      if (existing.length > 0) {
        throw new Error("This course is already added to the certification");
      }

      const [result] = await promisePool.query(
        `INSERT INTO certification_course_requirements (certification_id, course_id)
        VALUES (?, ?)`,
        [certificationId, courseId]
      );

      return {
        success: true,
        message: "Course requirement added successfully",
        requirementId: result.insertId,
      };
    } catch (error) {
      console.error("Error in addCourseRequirement:", error);
      throw error;
    }
  }

  // ============================================================================
  // REMOVE COURSE FROM CERTIFICATION
  // ============================================================================

  async removeCourseRequirement(certificationId, courseId) {
    try {
      const [result] = await promisePool.query(
        `DELETE FROM certification_course_requirements
        WHERE certification_id = ? AND course_id = ?`,
        [certificationId, courseId]
      );

      if (result.affectedRows === 0) {
        throw new Error("Course requirement not found");
      }

      return {
        success: true,
        message: "Course requirement removed successfully",
      };
    } catch (error) {
      console.error("Error in removeCourseRequirement:", error);
      throw error;
    }
  }

  // ============================================================================
  // LEARNER PROGRESS - Get students working on certifications
  // ============================================================================

  async getLearnerProgress(certificationId = null, status = null, search = null, page = 1, limit = 10) {
    try {
      const offset = (page - 1) * limit;
      let whereConditions = [];
      let params = [];

      // Filter by certification
      if (certificationId) {
        whereConditions.push('sce.certification_id = ?');
        params.push(certificationId);
      }

      // Filter by enrollment status
      if (status && status !== 'all') {
        whereConditions.push('sce.status = ?');
        params.push(status);
      }

      // Search by student name
      if (search && search.trim()) {
        whereConditions.push('(s.first_name LIKE ? OR s.last_name LIKE ? OR u.email LIKE ?)');
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }

      const whereClause = whereConditions.length > 0
        ? 'WHERE ' + whereConditions.join(' AND ')
        : '';

      // Get total count
      const [countResult] = await promisePool.query(
        `SELECT COUNT(*) as total
        FROM student_certification_enrollments sce
        INNER JOIN students s ON sce.user_id COLLATE utf8mb4_general_ci = s.user_id COLLATE utf8mb4_general_ci
        INNER JOIN users u ON s.user_id COLLATE utf8mb4_general_ci = u.uuid COLLATE utf8mb4_general_ci
        ${whereClause}`,
        params
      );

      const totalCount = countResult[0].total;

      // Get learner progress data
      const [learners] = await promisePool.query(
        `SELECT
          sce.id as enrollment_id,
          sce.user_id,
          sce.certification_id,
          c.certification_name,
          c.validity_type,
          c.validity_period,
          sce.enrollment_date,
          sce.completion_date,
          sce.certificate_issued_date,
          sce.status,

          -- Student info
          CONCAT(s.first_name, ' ', s.last_name) AS student_name,
          u.email AS student_email,
          s.dp AS student_avatar,

          -- Calculate required courses
          (SELECT COUNT(DISTINCT course_id)
           FROM certification_course_requirements
           WHERE certification_id = sce.certification_id) AS total_required_courses,

          -- Calculate completed courses
          (SELECT COUNT(DISTINCT ccr.course_id)
           FROM certification_course_requirements ccr
           INNER JOIN enrol e ON ccr.course_id = e.course_id AND e.user_id COLLATE utf8mb4_general_ci = sce.user_id COLLATE utf8mb4_general_ci
           INNER JOIN course_progress cp ON e.id = cp.enroll_id
           WHERE ccr.certification_id = sce.certification_id
           GROUP BY ccr.certification_id
           HAVING AVG(cp.lesson_completed) = 1) AS completed_courses,

          -- Calculate expiry date
          CASE
            WHEN c.validity_type = 'limited' AND sce.certificate_issued_date IS NOT NULL
            THEN DATE_ADD(sce.certificate_issued_date, INTERVAL c.validity_period DAY)
            ELSE NULL
          END AS expiry_date,

          -- Check if expiring soon (within 30 days)
          CASE
            WHEN c.validity_type = 'limited'
              AND sce.certificate_issued_date IS NOT NULL
              AND DATE_ADD(sce.certificate_issued_date, INTERVAL c.validity_period DAY) BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)
            THEN 1
            ELSE 0
          END AS is_expiring_soon

        FROM student_certification_enrollments sce
        INNER JOIN certifications c ON sce.certification_id = c.id
        INNER JOIN students s ON sce.user_id COLLATE utf8mb4_general_ci = s.user_id COLLATE utf8mb4_general_ci
        INNER JOIN users u ON s.user_id COLLATE utf8mb4_general_ci = u.uuid COLLATE utf8mb4_general_ci
        ${whereClause}
        ORDER BY sce.enrollment_date DESC
        LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );

      // Calculate progress percentage for each learner
      const learnersWithProgress = learners.map(learner => {
        const total = learner.total_required_courses || 0;
        const completed = learner.completed_courses || 0;
        const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

        return {
          ...learner,
          progress_percentage: progress,
        };
      });

      return {
        success: true,
        data: learnersWithProgress,
        pagination: {
          total: totalCount,
          page: page,
          limit: limit,
          totalPages: Math.ceil(totalCount / limit),
        },
      };
    } catch (error) {
      console.error("Error in getLearnerProgress:", error);
      throw error;
    }
  }

  // ============================================================================
  // EXPIRY & RENEWALS - Get certifications expiring soon or expired
  // ============================================================================

  async getExpiryRenewals(filter = 'expiring_soon', page = 1, limit = 10) {
    try {
      const offset = (page - 1) * limit;
      let whereConditions = [
        'sce.status = ?',
        'sce.certificate_issued_date IS NOT NULL',
        'c.validity_type = ?'
      ];
      let params = ['completed', 'limited'];

      // Add filter conditions
      if (filter === 'expiring_soon') {
        whereConditions.push('DATE_ADD(sce.certificate_issued_date, INTERVAL c.validity_period DAY) BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)');
      } else if (filter === 'expired') {
        whereConditions.push('DATE_ADD(sce.certificate_issued_date, INTERVAL c.validity_period DAY) < CURDATE()');
      }

      const whereClause = 'WHERE ' + whereConditions.join(' AND ');

      // Get total count
      const [countResult] = await promisePool.query(
        `SELECT COUNT(*) as total
        FROM student_certification_enrollments sce
        INNER JOIN certifications c ON sce.certification_id = c.id
        ${whereClause}`,
        params
      );

      const totalCount = countResult[0].total;

      // Get expiry data
      const [renewals] = await promisePool.query(
        `SELECT
          sce.id as enrollment_id,
          sce.user_id,
          sce.certification_id,
          c.certification_name,
          c.validity_period,
          sce.certificate_issued_date,
          DATE_ADD(sce.certificate_issued_date, INTERVAL c.validity_period DAY) AS expiry_date,
          DATEDIFF(DATE_ADD(sce.certificate_issued_date, INTERVAL c.validity_period DAY), CURDATE()) AS days_until_expiry,

          -- Student info
          CONCAT(s.first_name, ' ', s.last_name) AS student_name,
          u.email AS student_email,
          s.dp AS student_avatar,

          -- Check if expired
          CASE
            WHEN DATE_ADD(sce.certificate_issued_date, INTERVAL c.validity_period DAY) < CURDATE()
            THEN 'expired'
            ELSE 'expiring_soon'
          END AS renewal_status

        FROM student_certification_enrollments sce
        INNER JOIN certifications c ON sce.certification_id = c.id
        INNER JOIN students s ON sce.user_id COLLATE utf8mb4_general_ci = s.user_id COLLATE utf8mb4_general_ci
        INNER JOIN users u ON s.user_id COLLATE utf8mb4_general_ci = u.uuid COLLATE utf8mb4_general_ci
        ${whereClause}
        ORDER BY expiry_date ASC
        LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );

      return {
        success: true,
        data: renewals,
        pagination: {
          total: totalCount,
          page: page,
          limit: limit,
          totalPages: Math.ceil(totalCount / limit),
        },
      };
    } catch (error) {
      console.error("Error in getExpiryRenewals:", error);
      throw error;
    }
  }

  // ============================================================================
  // ENROLL STUDENT IN CERTIFICATION
  // ============================================================================

  async enrollStudent(certificationId, userId, enrolledBy) {
    try {
      // Check if already enrolled
      const [existing] = await promisePool.query(
        `SELECT id FROM student_certification_enrollments
        WHERE user_id = ? AND certification_id = ?`,
        [userId, certificationId]
      );

      if (existing.length > 0) {
        throw new Error("Student is already enrolled in this certification");
      }

      // Enroll student
      const [result] = await promisePool.query(
        `INSERT INTO student_certification_enrollments
        (user_id, certification_id, enrolled_by, status)
        VALUES (?, ?, ?, 'in_progress')`,
        [userId, certificationId, enrolledBy]
      );

      return {
        success: true,
        enrollmentId: result.insertId,
        message: "Student enrolled successfully",
      };
    } catch (error) {
      console.error("Error in enrollStudent:", error);
      throw error;
    }
  }

  // ============================================================================
  // CHECK AND ISSUE CERTIFICATE
  // ============================================================================

  async checkAndIssueCertificate(enrollmentId) {
    try {
      // Get enrollment details
      const [enrollment] = await promisePool.query(
        `SELECT
          sce.*,
          c.certification_name,
          c.template_file_path
        FROM student_certification_enrollments sce
        INNER JOIN certifications c ON sce.certification_id = c.id
        WHERE sce.id = ?`,
        [enrollmentId]
      );

      if (enrollment.length === 0) {
        throw new Error("Enrollment not found");
      }

      const enrollmentData = enrollment[0];

      // Get required courses
      const [requiredCourses] = await promisePool.query(
        `SELECT course_id FROM certification_course_requirements
        WHERE certification_id = ?`,
        [enrollmentData.certification_id]
      );

      if (requiredCourses.length === 0) {
        throw new Error("No course requirements found for this certification");
      }

      const requiredCourseIds = requiredCourses.map(rc => rc.course_id);

      // Check if student completed all required courses
      const [completedCourses] = await promisePool.query(
        `SELECT DISTINCT e.course_id
        FROM enrol e
        INNER JOIN course_progress cp ON e.id = cp.enroll_id
        WHERE e.user_id COLLATE utf8mb4_general_ci = ? COLLATE utf8mb4_general_ci
        AND e.course_id IN (?)
        GROUP BY e.course_id
        HAVING AVG(cp.lesson_completed) = 1`,
        [enrollmentData.user_id, requiredCourseIds]
      );

      const completedCourseIds = completedCourses.map(cc => cc.course_id);

      // Check if all required courses are completed
      const allCompleted = requiredCourseIds.every(id => completedCourseIds.includes(id));

      if (!allCompleted) {
        return {
          success: false,
          message: "Student has not completed all required courses",
          completed: completedCourseIds.length,
          total: requiredCourseIds.length,
        };
      }

      // Issue certificate
      const certificateFilePath = `/certificates/${enrollmentData.user_id}_${enrollmentData.certification_id}_${Date.now()}.pdf`;

      await promisePool.query(
        `UPDATE student_certification_enrollments
        SET
          completion_date = NOW(),
          certificate_issued_date = NOW(),
          certificate_file_path = ?,
          status = 'completed'
        WHERE id = ?`,
        [certificateFilePath, enrollmentId]
      );

      return {
        success: true,
        message: "Certificate issued successfully",
        certificateFilePath,
      };
    } catch (error) {
      console.error("Error in checkAndIssueCertificate:", error);
      throw error;
    }
  }
}

module.exports = new CertificationService();
