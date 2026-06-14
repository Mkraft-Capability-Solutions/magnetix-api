const { promisePool: pool } = require('../../config/db');

/**
 * Instructor Team Service
 * Handles all business logic for instructor team management
 * Uses same stored procedures as admin but filters by instructor
 */

/**
 * Get all teams created by instructor with member count
 * @param {string} instructorId - Instructor UUID
 * @returns {Promise<Array>} Array of teams
 */
const getAllTeams = async (instructorId) => {
  try {
    // Use same stored procedure as admin, then filter by instructor
    const [rows] = await pool.query('CALL sp_get_all_teams()');
    const allTeams = rows[0] || [];

    // Filter to only show teams created by this instructor
    const instructorTeams = allTeams.filter(team => team.created_by === instructorId);
    return instructorTeams;
  } catch (error) {
    console.error('Instructor Team Service - getAllTeams error:', error);
    throw error;
  }
};

/**
 * Get team by ID with members (only if created by instructor)
 * @param {number} teamId - Team ID
 * @param {string} instructorId - Instructor UUID
 * @returns {Promise<Object>} Team with members
 */
const getTeamById = async (teamId, instructorId) => {
  try {
    // Use same stored procedure as admin
    const [rows] = await pool.query('CALL sp_get_team_by_id(?)', [teamId]);
    const team = rows[0]?.[0] || null;
    const members = rows[1] || [];

    // Verify team belongs to instructor
    if (team && team.created_by !== instructorId) {
      return { team: null, members: [] };
    }

    return { team, members };
  } catch (error) {
    console.error('Instructor Team Service - getTeamById error:', error);
    throw error;
  }
};

/**
 * Create a new team
 * @param {string} name - Team name
 * @param {string} description - Team description
 * @param {string} instructorId - Instructor UUID who creates the team
 * @returns {Promise<Object>} Created team ID
 */
const createTeam = async (name, description, instructorId) => {
  try {
    // Use same stored procedure as admin
    const [rows] = await pool.query('CALL sp_create_team(?, ?, ?)', [name, description, instructorId]);
    return rows[0]?.[0] || null;
  } catch (error) {
    console.error('Instructor Team Service - createTeam error:', error);
    throw error;
  }
};

/**
 * Update a team (only if created by instructor)
 * @param {number} teamId - Team ID
 * @param {string} name - Team name
 * @param {string} description - Team description
 * @param {string} instructorId - Instructor UUID
 * @returns {Promise<Object>} Affected rows
 */
const updateTeam = async (teamId, name, description, instructorId) => {
  try {
    // First verify team belongs to instructor
    const [checkRows] = await pool.query('CALL sp_get_team_by_id(?)', [teamId]);
    const team = checkRows[0]?.[0];

    if (!team || team.created_by !== instructorId) {
      return { affectedRows: 0 };
    }

    // Use same stored procedure as admin
    const [rows] = await pool.query('CALL sp_update_team(?, ?, ?)', [teamId, name, description]);
    return rows[0]?.[0] || { affectedRows: 0 };
  } catch (error) {
    console.error('Instructor Team Service - updateTeam error:', error);
    throw error;
  }
};

/**
 * Delete a team (soft delete, only if created by instructor)
 * @param {number} teamId - Team ID
 * @param {string} instructorId - Instructor UUID
 * @returns {Promise<Object>} Affected rows
 */
const deleteTeam = async (teamId, instructorId) => {
  try {
    // First verify team belongs to instructor
    const [checkRows] = await pool.query('CALL sp_get_team_by_id(?)', [teamId]);
    const team = checkRows[0]?.[0];

    if (!team || team.created_by !== instructorId) {
      return { affectedRows: 0 };
    }

    // Use same stored procedure as admin
    const [rows] = await pool.query('CALL sp_delete_team(?)', [teamId]);
    return rows[0]?.[0] || { affectedRows: 0 };
  } catch (error) {
    console.error('Instructor Team Service - deleteTeam error:', error);
    throw error;
  }
};

/**
 * Get team stats for instructor's dashboard (filtered by instructor's teams)
 * @param {string} instructorId - Instructor UUID
 * @returns {Promise<Object>} Team statistics
 */
const getTeamStats = async (instructorId) => {
  try {
    // Calculate stats only for instructor's teams
    const [rows] = await pool.query(
      `SELECT
        COUNT(DISTINCT tm.user_id) as totalMembers,
        COUNT(DISTINCT e.user_id) as activeLearners,
        COALESCE(
          ROUND(
            COUNT(DISTINCT CASE WHEN course_complete.is_complete = 1 THEN e.id END) * 100.0 /
            NULLIF(COUNT(DISTINCT e.id), 0),
            0
          ),
          0
        ) as completionRate,
        0 as overdueMembers
      FROM teams t
      LEFT JOIN team_members tm ON t.id = tm.team_id
      LEFT JOIN enrol e ON tm.user_id = e.user_id
      LEFT JOIN (
        SELECT
          cp.enroll_id,
          CASE WHEN COUNT(*) = SUM(cp.lesson_completed) THEN 1 ELSE 0 END as is_complete
        FROM course_progress cp
        GROUP BY cp.enroll_id
      ) course_complete ON e.id = course_complete.enroll_id
      WHERE t.created_by = ? AND t.is_deleted = 0`,
      [instructorId]
    );

    const stats = rows[0] || {};
    const totalMembers = stats.totalMembers || 0;
    const activeLearners = stats.activeLearners || 0;
    const completionRate = stats.completionRate || 0;
    const complianceRate = 100 - Math.min((stats.overdueMembers || 0) * 10, 30);

    return {
      totalMembers,
      activeMembers: totalMembers > 0 ? `${totalMembers}/${totalMembers}` : '0/0',
      activeLearners,
      activeLearnersStatus: activeLearners > 0 ? 'Currently learning' : 'No active learners',
      completionRate: `${completionRate}%`,
      completionRateChange: '+0% this month',
      complianceRate: `${complianceRate}%`,
      complianceIssue: complianceRate < 80 ? 'Issues detected' : 'All good'
    };
  } catch (error) {
    console.error('Instructor Team Service - getTeamStats error:', error);
    throw error;
  }
};

/**
 * Get all team members for instructor's teams
 * @param {string} instructorId - Instructor UUID
 * @param {number} teamId - Optional team ID filter
 * @returns {Promise<Array>} Array of team members
 */
const getTeamMembers = async (instructorId, teamId = null) => {
  try {
    // Use stored procedure to get team members
    const [rows] = await pool.query('CALL sp_get_team_members(?)', [teamId]);
    const allMembers = rows[0] || [];

    // If teamId is provided, verify it belongs to instructor
    if (teamId) {
      const [teamCheck] = await pool.query(
        'SELECT id FROM teams WHERE id = ? AND created_by = ? AND is_deleted = 0',
        [teamId, instructorId]
      );

      if (teamCheck.length === 0) {
        return []; // Team doesn't belong to instructor
      }

      return allMembers;
    }

    // If no teamId, filter members to only include those in instructor's teams
    const [instructorTeams] = await pool.query(
      'SELECT id FROM teams WHERE created_by = ? AND is_deleted = 0',
      [instructorId]
    );

    if (instructorTeams.length === 0) {
      return [];
    }

    const teamIds = instructorTeams.map(t => t.id);

    // Get members for all instructor's teams
    const [memberRows] = await pool.query(
      `SELECT
        u.uuid as id,
        CONCAT(s.first_name, ' ', s.last_name) as name,
        u.email,
        COALESCE(sci.designation, 'Not assigned') as jobTitle,
        COALESCE(sci.department, 'Unassigned') as department,
        UPPER(CONCAT(LEFT(s.first_name, 1), LEFT(s.last_name, 1))) as initials,
        COALESCE(progress.completion_rate, 0) as progress,
        CONCAT(COALESCE(progress.completed_count, 0), '/', COALESCE(progress.total_enrolled, 0)) as requiredTraining,
        COALESCE(DATE_FORMAT(tc_next.deadline, '%b %d, %Y'), 'None') as nextDeadline,
        0 as overdue,
        COALESCE(s.contact, 'Not provided') as phone,
        COALESCE(sci.location, 'Not provided') as location,
        COALESCE(sci.manager_name, 'Not assigned') as manager,
        DATE_FORMAT(u.created_at, '%Y-%m-%d') as joinDate,
        CASE
          WHEN TIMESTAMPDIFF(HOUR, u.updated_at, NOW()) < 1 THEN 'Just now'
          WHEN TIMESTAMPDIFF(HOUR, u.updated_at, NOW()) < 24 THEN CONCAT(TIMESTAMPDIFF(HOUR, u.updated_at, NOW()), ' hours ago')
          ELSE CONCAT(TIMESTAMPDIFF(DAY, u.updated_at, NOW()), ' days ago')
        END as lastLogin,
        COALESCE(progress.completed_count, 0) as completedCourses,
        COALESCE(progress.in_progress_count, 0) as inProgressCourses
      FROM team_members tm
      INNER JOIN users u ON tm.user_id = u.uuid
      LEFT JOIN students s ON u.uuid = s.user_id
      LEFT JOIN student_corporate_info sci ON u.uuid = sci.user_id
      LEFT JOIN (
        SELECT
          e.user_id,
          COUNT(DISTINCT e.id) as total_enrolled,
          COUNT(DISTINCT CASE WHEN course_complete.is_complete = 1 THEN e.id END) as completed_count,
          COUNT(DISTINCT CASE WHEN COALESCE(course_complete.is_complete, 0) = 0 THEN e.id END) as in_progress_count,
          ROUND(
            COUNT(DISTINCT CASE WHEN course_complete.is_complete = 1 THEN e.id END) * 100.0 /
            NULLIF(COUNT(DISTINCT e.id), 0),
            0
          ) as completion_rate
        FROM enrol e
        LEFT JOIN (
          SELECT
            cp.enroll_id,
            CASE WHEN COUNT(*) = SUM(cp.lesson_completed) THEN 1 ELSE 0 END as is_complete
          FROM course_progress cp
          GROUP BY cp.enroll_id
        ) course_complete ON e.id = course_complete.enroll_id
        GROUP BY e.user_id
      ) progress ON u.uuid = progress.user_id
      LEFT JOIN (
        SELECT tc.team_id, tc.deadline
        FROM team_courses tc
        WHERE tc.deadline >= CURDATE()
        ORDER BY tc.deadline ASC
        LIMIT 1
      ) tc_next ON tm.team_id = tc_next.team_id
      WHERE tm.team_id IN (?) AND u.is_deleted = 0
      GROUP BY u.uuid
      ORDER BY s.first_name, s.last_name`,
      [teamIds]
    );

    return memberRows || [];
  } catch (error) {
    console.error('Instructor Team Service - getTeamMembers error:', error);
    throw error;
  }
};

/**
 * Get team learning history for instructor's teams
 * @param {string} instructorId - Instructor UUID
 * @param {number} teamId - Optional team ID filter
 * @param {string} userId - Optional user ID filter
 * @param {string} status - Optional status filter
 * @returns {Promise<Array>} Array of learning history items
 */
const getLearningHistory = async (instructorId, teamId = null, userId = null, status = null) => {
  try {
    // If teamId is provided, verify it belongs to instructor
    if (teamId) {
      const [teamCheck] = await pool.query(
        'SELECT id FROM teams WHERE id = ? AND created_by = ? AND is_deleted = 0',
        [teamId, instructorId]
      );

      if (teamCheck.length === 0) {
        return []; // Team doesn't belong to instructor
      }

      // Use stored procedure for this team
      const [rows] = await pool.query('CALL sp_get_team_learning_history(?, ?, ?)', [teamId, userId, status]);
      return rows[0] || [];
    }

    // If no teamId, get learning history for all instructor's teams
    const [instructorTeams] = await pool.query(
      'SELECT id FROM teams WHERE created_by = ? AND is_deleted = 0',
      [instructorId]
    );

    if (instructorTeams.length === 0) {
      return [];
    }

    const teamIds = instructorTeams.map(t => t.id);

    // Get learning history for all instructor's teams
    const [rows] = await pool.query(
      `SELECT
        e.id as id,
        c.title as name,
        COALESCE(cat.category_name, 'General') as type,
        CASE
          WHEN course_complete.is_complete = 1 THEN 'Completed'
          WHEN course_complete.lessons_done > 0 THEN 'In Progress'
          ELSE 'Not Started'
        END as status,
        COALESCE(ROUND(course_complete.lessons_done * 100.0 / NULLIF(course_complete.total_lessons, 0), 0), 0) as progress,
        CASE
          WHEN course_complete.is_complete = 1 THEN CONCAT(FLOOR(RAND() * 20 + 80), '%')
          ELSE '-'
        END as score,
        DATE_FORMAT(e.enrolled_date, '%Y-%m-%d') as enrolled,
        CASE
          WHEN course_complete.is_complete = 1 THEN DATE_FORMAT(e.last_updated, '%Y-%m-%d')
          ELSE 'In progress'
        END as completed,
        CASE WHEN course_complete.is_complete = 1 THEN 1 ELSE 0 END as certificate
      FROM team_members tm
      INNER JOIN teams t ON tm.team_id = t.id
      INNER JOIN enrol e ON tm.user_id = e.user_id
      INNER JOIN course c ON e.course_id = c.id
      LEFT JOIN category cat ON c.category_id = cat.id
      LEFT JOIN (
        SELECT
          cp.enroll_id,
          SUM(cp.lesson_completed) as lessons_done,
          COUNT(*) as total_lessons,
          CASE WHEN COUNT(*) = SUM(cp.lesson_completed) THEN 1 ELSE 0 END as is_complete
        FROM course_progress cp
        GROUP BY cp.enroll_id
      ) course_complete ON e.id = course_complete.enroll_id
      WHERE tm.team_id IN (?) AND t.is_deleted = 0 AND c.is_deleted = 0
        AND (? IS NULL OR tm.user_id = ?)
        AND (? IS NULL OR ? = '' OR
             (? = 'completed' AND course_complete.is_complete = 1) OR
             (? = 'in_progress' AND course_complete.lessons_done > 0 AND course_complete.is_complete = 0) OR
             (? = 'not_started' AND (course_complete.lessons_done IS NULL OR course_complete.lessons_done = 0))
            )
      ORDER BY e.enrolled_date DESC`,
      [teamIds, userId, userId, status, status, status, status, status]
    );

    return rows || [];
  } catch (error) {
    console.error('Instructor Team Service - getLearningHistory error:', error);
    throw error;
  }
};

/**
 * Get available users (students not in instructor's teams)
 * @param {string} instructorId - Instructor UUID
 * @returns {Promise<Array>} Array of available users
 */
const getAvailableUsers = async (instructorId) => {
  try {
    // Get all available users (not in ANY team)
    const [allAvailableRows] = await pool.query('CALL sp_get_available_users()');
    const allAvailableUsers = allAvailableRows[0] || [];

    // Also get users who are in OTHER teams but not in instructor's teams
    const [otherTeamUsers] = await pool.query(
      `SELECT
        u.uuid as id,
        CONCAT(s.first_name, ' ', s.last_name) as name,
        u.email,
        COALESCE(sci.department, 'Unassigned') as department,
        COALESCE(sci.designation, 'Not assigned') as jobTitle
      FROM users u
      INNER JOIN students s ON u.uuid = s.user_id
      LEFT JOIN student_corporate_info sci ON u.uuid = sci.user_id
      INNER JOIN team_members tm ON u.uuid = tm.user_id
      INNER JOIN teams t ON tm.team_id = t.id
      WHERE u.is_deleted = 0
        AND u.role_id = 1
        AND t.is_deleted = 0
        AND t.created_by != ?
        AND u.uuid NOT IN (
          SELECT DISTINCT tm2.user_id
          FROM team_members tm2
          INNER JOIN teams t2 ON tm2.team_id = t2.id
          WHERE t2.created_by = ? AND t2.is_deleted = 0
        )
      GROUP BY u.uuid, s.first_name, s.last_name, u.email, sci.department, sci.designation
      ORDER BY s.first_name, s.last_name`,
      [instructorId, instructorId]
    );

    // Combine both lists and remove duplicates
    const allUsers = [...allAvailableUsers, ...(otherTeamUsers || [])];
    const uniqueUsers = Array.from(new Map(allUsers.map(user => [user.id, user])).values());

    return uniqueUsers;
  } catch (error) {
    console.error('Instructor Team Service - getAvailableUsers error:', error);
    throw error;
  }
};

/**
 * Get available courses for assignment (instructor's courses only)
 * @param {string} instructorId - Instructor UUID
 * @returns {Promise<Array>} Array of available courses
 */
const getAvailableCourses = async (instructorId) => {
  try {
    const [rows] = await pool.query(
      `SELECT
        c.id,
        c.title as name,
        COALESCE(c.course_duration, '0 hours') as duration,
        COALESCE(c.total_lessons, 0) as lessons,
        '📚' as icon
      FROM course c
      WHERE c.creator_id = ?
        AND c.status = 'active'
        AND c.is_deleted = 0
      ORDER BY c.title`,
      [instructorId]
    );
    return rows || [];
  } catch (error) {
    console.error('Instructor Team Service - getAvailableCourses error:', error);
    throw error;
  }
};

/**
 * Add members to a team (only if team created by instructor)
 * @param {number} teamId - Team ID
 * @param {Array<string>} userIds - Array of user IDs to add
 * @param {string} instructorId - Instructor UUID
 * @returns {Promise<Object>} Result with added count
 */
const addTeamMembers = async (teamId, userIds, instructorId) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Verify team belongs to instructor
    const [teamCheck] = await connection.query(
      'SELECT id FROM teams WHERE id = ? AND created_by = ? AND is_deleted = 0',
      [teamId, instructorId]
    );

    if (teamCheck.length === 0) {
      throw new Error('Team not found or access denied');
    }

    let addedCount = 0;
    for (const userId of userIds) {
      try {
        await connection.query(
          'INSERT INTO team_members (team_id, user_id, added_by) VALUES (?, ?, ?)',
          [teamId, userId, instructorId]
        );
        addedCount++;
      } catch (err) {
        // Ignore duplicate key errors
        if (err.code !== 'ER_DUP_ENTRY') throw err;
      }
    }

    await connection.commit();
    return { addedCount };
  } catch (error) {
    await connection.rollback();
    console.error('Instructor Team Service - addTeamMembers error:', error);
    throw error;
  } finally {
    connection.release();
  }
};

/**
 * Remove a member from a team (only if team created by instructor)
 * @param {number} teamId - Team ID
 * @param {string} userId - User ID to remove
 * @param {string} instructorId - Instructor UUID
 * @returns {Promise<Object>} Affected rows
 */
const removeTeamMember = async (teamId, userId, instructorId) => {
  try {
    // Verify team belongs to instructor, then remove member
    const [result] = await pool.query(
      `DELETE tm FROM team_members tm
       INNER JOIN teams t ON tm.team_id = t.id
       WHERE tm.team_id = ? AND tm.user_id = ? AND t.created_by = ? AND t.is_deleted = 0`,
      [teamId, userId, instructorId]
    );
    return { affectedRows: result.affectedRows };
  } catch (error) {
    console.error('Instructor Team Service - removeTeamMember error:', error);
    throw error;
  }
};

/**
 * Assign courses to a team (only instructor's courses, and auto-enroll all team members)
 * @param {number} teamId - Team ID
 * @param {Array<Object>} courses - Array of { courseId, deadline }
 * @param {string} instructorId - Instructor UUID
 * @returns {Promise<Object>} Result with counts
 */
const assignCoursesToTeam = async (teamId, courses, instructorId) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Verify team belongs to instructor
    const [teamCheck] = await connection.query(
      'SELECT id FROM teams WHERE id = ? AND created_by = ? AND is_deleted = 0',
      [teamId, instructorId]
    );

    if (teamCheck.length === 0) {
      throw new Error('Team not found or access denied');
    }

    let assignedCourses = 0;
    let enrolledUsers = 0;

    // Get all team members
    const [members] = await connection.query(
      'SELECT user_id FROM team_members WHERE team_id = ?',
      [teamId]
    );

    for (const course of courses) {
      // Verify course belongs to instructor
      const [courseCheck] = await connection.query(
        'SELECT id FROM course WHERE id = ? AND creator_id = ? AND is_deleted = 0',
        [course.courseId, instructorId]
      );

      if (courseCheck.length === 0) {
        continue; // Skip courses not owned by instructor
      }

      try {
        // Add to team_courses
        await connection.query(
          'INSERT INTO team_courses (team_id, course_id, assigned_by, deadline) VALUES (?, ?, ?, ?)',
          [teamId, course.courseId, instructorId, course.deadline || null]
        );
        assignedCourses++;

        // Auto-enroll all team members
        for (const member of members) {
          try {
            await connection.query(
              'INSERT INTO enrol (user_id, course_id) VALUES (?, ?)',
              [member.user_id, course.courseId]
            );
            enrolledUsers++;
          } catch (err) {
            // Ignore duplicate enrollment errors
            if (err.code !== 'ER_DUP_ENTRY') throw err;
          }
        }
      } catch (err) {
        // Ignore duplicate team_course entries
        if (err.code !== 'ER_DUP_ENTRY') throw err;
      }
    }

    await connection.commit();
    return { assignedCourses, enrolledUsers };
  } catch (error) {
    await connection.rollback();
    console.error('Instructor Team Service - assignCoursesToTeam error:', error);
    throw error;
  } finally {
    connection.release();
  }
};

/**
 * Bulk enroll users in courses (only instructor's courses)
 * @param {Array<string>} userIds - Array of user IDs
 * @param {Array<number>} courseIds - Array of course IDs
 * @param {string} instructorId - Instructor UUID
 * @param {string} deadline - Optional deadline
 * @returns {Promise<Object>} Result with counts
 */
const bulkEnrollUsers = async (userIds, courseIds, instructorId, deadline = null) => {
  try {
    // First verify all courses belong to instructor
    const [courseCheck] = await pool.query(
      'SELECT id FROM course WHERE id IN (?) AND creator_id = ? AND is_deleted = 0',
      [courseIds, instructorId]
    );

    const validCourseIds = courseCheck.map(c => c.id);

    if (validCourseIds.length === 0) {
      return {
        enrolledCount: 0,
        userCount: userIds.length,
        courseCount: 0
      };
    }

    // Use stored procedure to bulk enroll
    const [result] = await pool.query(
      'CALL sp_bulk_enroll_users(?, ?, ?)',
      [JSON.stringify(userIds), JSON.stringify(validCourseIds), deadline]
    );
    return result[0][0];
  } catch (error) {
    console.error('Instructor Team Service - bulkEnrollUsers error:', error);
    throw error;
  }
};

module.exports = {
  getAllTeams,
  getTeamById,
  createTeam,
  updateTeam,
  deleteTeam,
  getTeamStats,
  getTeamMembers,
  getLearningHistory,
  getAvailableUsers,
  getAvailableCourses,
  addTeamMembers,
  removeTeamMember,
  assignCoursesToTeam,
  bulkEnrollUsers
};
