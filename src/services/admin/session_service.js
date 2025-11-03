// admin_session_service.js
const { promisePool } = require('../../config/db');
const googleMeetService = require('../../services/google/google_meet_service');
const emailHelper = require('../../utils/email_helper');


class AdminSessionService {
    /**
     * Check if instructor is available at the given date and time
     * Admin can schedule with ANY instructor during their available time
     */
    async checkInstructorAvailability(instructorId, sessionDate, sessionTime) {
        try {
            // Get instructor availability
            const [availability] = await promisePool.query(
                'CALL instructor_get_availability(?)',
                [instructorId]
            );

            // Check if instructor has no availability record
            if (availability[0].length === 0) {
                return {
                    valid: false,
                    message: 'Mentor is not available.'
                };
            }

            const availData = availability[0][0];

            // Check if instructor is inactive
            if (!availData.is_active || availData.is_active === 0) {
                return {
                    valid: false,
                    message: 'Mentor is not available.'
                };
            }

            return this.validateTimeSlot(sessionDate, sessionTime, availData);

        } catch (error) {
            console.error('Error checking instructor availability:', error);
            throw error;
        }
    }

    /**
     * Validate if the session time falls within instructor's availability
     */
    validateTimeSlot(sessionDate, sessionTime, availability) {
        // Check if the day is in available days
        const date = new Date(sessionDate);
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayName = dayNames[date.getDay()];

        let availableDays = availability.available_days;
        if (typeof availableDays === 'string') {
            try {
                availableDays = JSON.parse(availableDays);
            } catch (e) {
                availableDays = [];
            }
        }

        if (!availableDays.includes(dayName)) {
            // Format available days nicely
            const formattedDays = availableDays.length > 0
                ? availableDays.join(', ')
                : 'No days set';

            return {
                valid: false,
                message: `Instructor is not available on ${dayName}. Please try another day. Available days: ${formattedDays}.`
            };
        }

        // Check if time falls within available time range
        const sessionTimeStr = sessionTime.length === 5 ? `${sessionTime}:00` : sessionTime;
        const startTime = availability.start_time;
        const endTime = availability.end_time;

        if (sessionTimeStr < startTime || sessionTimeStr > endTime) {
            return {
                valid: false,
                message: `Instructor is not available at ${sessionTime}. Please try another time. Instructor is available from ${startTime.substring(0, 5)} to ${endTime.substring(0, 5)}.`
            };
        }

        return { valid: true };
    }

    /**
     * Get all available instructors for a specific date and time
     * @param {string} sessionDate - Date in YYYY-MM-DD format
     * @param {string} sessionTime - Time in HH:mm format
     * @returns {Array} List of available instructors
     */
    async getAvailableInstructors(sessionDate, sessionTime) {
        try {
            // Get all active instructors
            const [instructors] = await promisePool.query(
                `SELECT i.user_id, i.first_name, i.last_name, i.expertise, i.dp,
                        u.email, i.about
                 FROM instructors i
                 JOIN users u ON i.user_id = u.uuid
                 WHERE u.role_id = 2 AND u.status = "active" AND u.is_deleted = 0
                 ORDER BY i.first_name, i.last_name`
            );

            if (!sessionDate || !sessionTime) {
                // If no date/time provided, return all active instructors
                return instructors;
            }

            // Filter instructors based on availability for the given date/time
            const availableInstructors = [];

            for (const instructor of instructors) {
                const availabilityCheck = await this.checkInstructorAvailability(
                    instructor.user_id,
                    sessionDate,
                    sessionTime
                );

                if (availabilityCheck.valid) {
                    // Get availability details to show in the response
                    const [availability] = await promisePool.query(
                        'CALL instructor_get_availability(?)',
                        [instructor.user_id]
                    );

                    let availabilityInfo = {
                        availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
                        startTime: '09:00',
                        endTime: '17:00',
                        isActive: true
                    };

                    if (availability[0].length > 0) {
                        const avail = availability[0][0];
                        let days = avail.available_days;
                        if (typeof days === 'string') {
                            try {
                                days = JSON.parse(days);
                            } catch (e) {
                                days = availabilityInfo.availableDays;
                            }
                        }

                        availabilityInfo = {
                            availableDays: days,
                            startTime: avail.start_time ? avail.start_time.substring(0, 5) : '09:00',
                            endTime: avail.end_time ? avail.end_time.substring(0, 5) : '17:00',
                            isActive: avail.is_active
                        };
                    }

                    availableInstructors.push({
                        ...instructor,
                        availability: availabilityInfo
                    });
                }
            }

            return availableInstructors;

        } catch (error) {
            console.error('Error in getAvailableInstructors:', error);
            throw error;
        }
    }

    /**
     * Get all instructors (both available and unavailable)
     */
    async getAllInstructors() {
        try {
            const [instructors] = await promisePool.query(
                `SELECT i.user_id, i.first_name, i.last_name, i.expertise, i.dp,
                        u.email, i.about
                 FROM instructors i
                 JOIN users u ON i.user_id = u.uuid
                 WHERE u.role_id = 2 AND u.status = "active" AND u.is_deleted = 0
                 ORDER BY i.first_name, i.last_name`
            );

            // Get availability for each instructor
            const instructorsWithAvailability = [];

            for (const instructor of instructors) {
                const [availability] = await promisePool.query(
                    'CALL instructor_get_availability(?)',
                    [instructor.user_id]
                );

                let availabilityInfo = {
                    availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
                    startTime: '09:00',
                    endTime: '17:00',
                    isActive: true
                };

                if (availability[0].length > 0) {
                    const avail = availability[0][0];
                    let days = avail.available_days;
                    if (typeof days === 'string') {
                        try {
                            days = JSON.parse(days);
                        } catch (e) {
                            days = availabilityInfo.availableDays;
                        }
                    }

                    availabilityInfo = {
                        availableDays: days,
                        startTime: avail.start_time ? avail.start_time.substring(0, 5) : '09:00',
                        endTime: avail.end_time ? avail.end_time.substring(0, 5) : '17:00',
                        isActive: avail.is_active
                    };
                }

                instructorsWithAvailability.push({
                    ...instructor,
                    availability: availabilityInfo
                });
            }

            return instructorsWithAvailability;

        } catch (error) {
            console.error('Error in getAllInstructors:', error);
            throw error;
        }
    }

    /**
     * Schedule a new session between instructor and student
     */
    async scheduleSession(sessionData) {
        const { instructorId, menteeId, sessionDate, sessionTime, topic, description, duration, createdBy } = sessionData;

        try {
            // 1️⃣ Check instructor availability
            const availabilityCheck = await this.checkInstructorAvailability(
                instructorId,
                sessionDate,
                sessionTime
            );

            if (!availabilityCheck.valid) {
                throw new Error(availabilityCheck.message);
            }

            // 2️⃣ Fetch mentor & mentee details
            const mentor = await this.getUserDetails(instructorId, 'instructor');
            const mentee = await this.getUserDetails(menteeId, 'student');

            if (!mentor) {
                throw new Error('Mentor not found');
            }
            if (!mentee) {
                throw new Error('Mentee not found');
            }

            // 3️⃣ Create Google Meet + Calendar Event
            const startTime = new Date(`${sessionDate}T${sessionTime}:00`);
            const durationMinutes = parseInt(duration) || 30;
            const endTime = new Date(startTime.getTime() + durationMinutes * 60000);

            const meetLink = await googleMeetService.createMeetEvent({
                title: topic,
                startTime: startTime.toISOString(),
                endTime: endTime.toISOString(),
                attendees: [
                    { email: mentor.email },
                    { email: mentee.email }
                ]
            });

            if (!meetLink) {
                throw new Error('Failed to generate Google Meet link');
            }

            // 4️⃣ Save session in DB
            const [result] = await promisePool.query(
                `INSERT INTO scheduled_sessions
                (mentor_id, mentee_id, session_date, session_time, topic, description, url, duration, status, creator_id, last_updated_by)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'booked', ?, ?)`,
                [instructorId, menteeId, sessionDate, sessionTime, topic, description || '', meetLink, duration, createdBy, createdBy]
            );

            const newSession = {
                sessionId: result.insertId,
                topic,
                description,
                sessionDate,
                sessionTime,
                duration,
                meetLink,
                mentorName: `${mentor.first_name} ${mentor.last_name}`,
                menteeName: `${mentee.first_name} ${mentee.last_name}`
            };

            // 5️⃣ Send confirmation emails
            // Send email to mentor (showing mentee's name)
            await emailHelper.sendSessionScheduledEmail(
                mentor.email,
                mentor.first_name,
                newSession,
                `${mentee.first_name} ${mentee.last_name}`,
                'mentee'
            );

            // Send email to mentee (showing mentor's name)
            await emailHelper.sendSessionScheduledEmail(
                mentee.email,
                mentee.first_name,
                newSession,
                `${mentor.first_name} ${mentor.last_name}`,
                'mentor'
            );

            return newSession;
        } catch (error) {
            console.error('Error scheduling session:', error);
            throw error;
        }
    }


    /**
     * Update an existing session
     */
    async updateSession(sessionId, updateData, adminId) {
        const connection = await promisePool.getConnection();

        try {
            await connection.beginTransaction();

            // Check if session exists
            const [sessions] = await connection.query(
                'SELECT * FROM scheduled_sessions WHERE id = ?',
                [sessionId]
            );

            if (sessions.length === 0) {
                throw new Error('Session not found');
            }

            const session = sessions[0];

            // Build dynamic update query
            const updateFields = [];
            const updateValues = [];

            if (updateData.instructorId) {
                updateFields.push('mentor_id = ?');
                updateValues.push(updateData.instructorId);
            }
            if (updateData.menteeId) {
                updateFields.push('mentee_id = ?');
                updateValues.push(updateData.menteeId);
            }
            if (updateData.sessionDate) {
                updateFields.push('session_date = ?');
                updateValues.push(updateData.sessionDate);
            }
            if (updateData.sessionTime) {
                updateFields.push('session_time = ?');
                updateValues.push(updateData.sessionTime);
            }
            if (updateData.topic) {
                updateFields.push('topic = ?');
                updateValues.push(updateData.topic);
            }
            if (updateData.description !== undefined) {
                updateFields.push('description = ?');
                updateValues.push(updateData.description);
            }
            if (updateData.url) {
                updateFields.push('url = ?');
                updateValues.push(updateData.url);
            }
            if (updateData.duration) {
                updateFields.push('duration = ?');
                updateValues.push(updateData.duration);
            }

            // Check availability if instructor, date, or time is being updated
            if (updateData.instructorId || updateData.sessionDate || updateData.sessionTime) {
                const checkInstructorId = updateData.instructorId || session.mentor_id;
                const checkDate = updateData.sessionDate || session.session_date;
                const checkTime = updateData.sessionTime || session.session_time;

                const availabilityCheck = await this.checkInstructorAvailability(
                    checkInstructorId,
                    checkDate,
                    checkTime
                );

                if (!availabilityCheck.valid) {
                    throw new Error(availabilityCheck.message);
                }
            }

            updateFields.push('last_updated_by = ?');
            updateValues.push(adminId);
            updateFields.push('last_updated = NOW()');
            updateValues.push(sessionId);

            const updateQuery = `UPDATE scheduled_sessions SET ${updateFields.join(', ')} WHERE id = ?`;

            await connection.query(updateQuery, updateValues);

            // Fetch updated session
            const [updatedSessions] = await connection.query(
                `SELECT ss.*,
                        i.first_name as instructor_first_name, i.last_name as instructor_last_name,
                        s.first_name as mentee_first_name, s.last_name as mentee_last_name
                 FROM scheduled_sessions ss
                 JOIN instructors i ON ss.mentor_id = i.user_id
                 JOIN students s ON ss.mentee_id = s.user_id
                 WHERE ss.id = ?`,
                [sessionId]
            );

            await connection.commit();

              await emailHelper.sendSessionScheduledEmail(mentor.email, mentor.first_name, newSession);
              await emailHelper.sendSessionScheduledEmail(mentee.email, mentee.first_name, newSession);

            return updatedSessions[0];

        } catch (error) {
            await connection.rollback();
            console.error('Error in updateSession service:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    async getUserDetails(userId, role) {
        try {
            const table = role === 'instructor' ? 'instructors' : 'students';
            const [rows] = await promisePool.query(
                `SELECT u.email, i.first_name, i.last_name
                 FROM ${table} i
                 JOIN users u ON i.user_id = u.uuid
                 WHERE i.user_id = ?`,
                [userId]
            );
            return rows[0] || null;
        } catch (error) {
            console.error(`Error fetching ${role} details:`, error);
            throw new Error(`Failed to fetch ${role} details`);
        }
    }


    /**
     * Cancel/Delete a session
     */
    async deleteSession(sessionId, adminId) {
        try {
            const [result] = await promisePool.query(
                `UPDATE scheduled_sessions
                 SET status = 'cancelled', last_updated_by = ?, last_updated = NOW()
                 WHERE id = ?`,
                [adminId, sessionId]
            );

            if (result.affectedRows === 0) {
                throw new Error('Session not found');
            }

            return true;

        } catch (error) {
            console.error('Error in deleteSession service:', error);
            throw error;
        }
    }

    /**
     * Get all sessions with optional filters
     */
    async getAllSessions(limit = 50, offset = 0, filters = {}) {
        try {
            let query = `
                SELECT
                    ss.*,
                    i.first_name as instructor_first_name,
                    i.last_name as instructor_last_name,
                    ui.email as instructor_email,
                    i.dp as instructor_dp,
                    s.first_name as mentee_first_name,
                    s.last_name as mentee_last_name,
                    us.email as mentee_email,
                    s.dp as mentee_dp,
                    uc.email as creator_email,
                    uc.role_id as creator_role_id
                FROM scheduled_sessions ss
                JOIN instructors i ON ss.mentor_id = i.user_id
                JOIN users ui ON i.user_id = ui.uuid
                JOIN students s ON ss.mentee_id = s.user_id
                JOIN users us ON s.user_id = us.uuid
                LEFT JOIN users uc ON ss.creator_id = uc.uuid
                WHERE 1=1
            `;

            const queryParams = [];

            if (filters.status) {
                query += ' AND ss.status = ?';
                queryParams.push(filters.status);
            }

            if (filters.instructorId) {
                query += ' AND ss.mentor_id = ?';
                queryParams.push(filters.instructorId);
            }

            if (filters.menteeId) {
                query += ' AND ss.mentee_id = ?';
                queryParams.push(filters.menteeId);
            }

            query += ' ORDER BY ss.session_date DESC, ss.session_time DESC LIMIT ? OFFSET ?';
            queryParams.push(parseInt(limit), parseInt(offset));

            const [sessions] = await promisePool.query(query, queryParams);

            // Get total count
            let countQuery = 'SELECT COUNT(*) as total FROM scheduled_sessions ss WHERE 1=1';
            const countParams = [];

            if (filters.status) {
                countQuery += ' AND ss.status = ?';
                countParams.push(filters.status);
            }
            if (filters.instructorId) {
                countQuery += ' AND ss.mentor_id = ?';
                countParams.push(filters.instructorId);
            }
            if (filters.menteeId) {
                countQuery += ' AND ss.mentee_id = ?';
                countParams.push(filters.menteeId);
            }

            const [countResult] = await promisePool.query(countQuery, countParams);
            const total = countResult[0].total;

            return {
                sessions,
                pagination: {
                    total,
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                    hasMore: (parseInt(offset) + sessions.length) < total
                }
            };

        } catch (error) {
            console.error('Error in getAllSessions service:', error);
            throw error;
        }
    }

    /**
     * Get a specific session by ID
     */
    async getSessionById(sessionId) {
        try {
            const [sessions] = await promisePool.query(
                `SELECT
                    ss.*,
                    i.first_name as instructor_first_name,
                    i.last_name as instructor_last_name,
                    ui.email as instructor_email,
                    i.dp as instructor_dp,
                    s.first_name as mentee_first_name,
                    s.last_name as mentee_last_name,
                    us.email as mentee_email,
                    s.dp as mentee_dp,
                    uc.email as creator_email,
                    uc.role_id as creator_role_id
                FROM scheduled_sessions ss
                JOIN instructors i ON ss.mentor_id = i.user_id
                JOIN users ui ON i.user_id = ui.uuid
                JOIN students s ON ss.mentee_id = s.user_id
                JOIN users us ON s.user_id = us.uuid
                LEFT JOIN users uc ON ss.creator_id = uc.uuid
                WHERE ss.id = ?`,
                [sessionId]
            );

            return sessions.length > 0 ? sessions[0] : null;

        } catch (error) {
            console.error('Error in getSessionById service:', error);
            throw error;
        }
    }

    /**
     * Get session statistics
     */
    async getSessionStats() {
        try {
            const [stats] = await promisePool.query(`
                SELECT
                    COUNT(*) as total,
                    SUM(CASE WHEN status = 'booked' THEN 1 ELSE 0 END) as booked,
                    SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
                    SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
                    SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected
                FROM scheduled_sessions
            `);

            return stats[0];

        } catch (error) {
            console.error('Error in getSessionStats service:', error);
            throw error;
        }
    }

    /**
     * Get all sessions with optional status filter
     */
    async getAllSessions({ status = null, limit = 10, offset = 0 }) {
        try {
            let query = `
                SELECT ss.*,
                       i.first_name as instructor_first_name, i.last_name as instructor_last_name,
                       s.first_name as mentee_first_name, s.last_name as mentee_last_name,
                       u1.email as instructor_email, u2.email as mentee_email
                FROM scheduled_sessions ss
                JOIN instructors i ON ss.mentor_id = i.user_id
                JOIN students s ON ss.mentee_id = s.user_id
                JOIN users u1 ON i.user_id = u1.uuid
                JOIN users u2 ON s.user_id = u2.uuid
                WHERE 1=1
            `;

            const params = [];

            if (status) {
                query += ' AND ss.status = ?';
                params.push(status);
            }

            // Exclude past sessions from regular queries
            query += ` AND NOT (
                CONCAT(ss.session_date, ' ', ss.session_time) < NOW() - INTERVAL
                CAST(SUBSTRING_INDEX(ss.duration, ' ', 1) AS UNSIGNED) MINUTE
            )`;

            query += ' ORDER BY ss.session_date DESC, ss.session_time DESC LIMIT ? OFFSET ?';
            params.push(parseInt(limit), parseInt(offset));

            const [sessions] = await promisePool.query(query, params);

            // Get total count
            let countQuery = 'SELECT COUNT(*) as total FROM scheduled_sessions ss WHERE 1=1';
            const countParams = [];

            if (status) {
                countQuery += ' AND ss.status = ?';
                countParams.push(status);
            }

            countQuery += ` AND NOT (
                CONCAT(ss.session_date, ' ', ss.session_time) < NOW() - INTERVAL
                CAST(SUBSTRING_INDEX(ss.duration, ' ', 1) AS UNSIGNED) MINUTE
            )`;

            const [countResult] = await promisePool.query(countQuery, countParams);

            return {
                sessions,
                total: countResult[0].total,
                limit: parseInt(limit),
                offset: parseInt(offset)
            };

        } catch (error) {
            console.error('Error in getAllSessions service:', error);
            throw error;
        }
    }

    /**
     * Get sessions by specific status
     */
    async getSessionsByStatus(status, limit = 10, offset = 0) {
        try {
            const query = `
                SELECT ss.*,
                       i.first_name as instructor_first_name, i.last_name as instructor_last_name,
                       s.first_name as mentee_first_name, s.last_name as mentee_last_name,
                       u1.email as instructor_email, u2.email as mentee_email
                FROM scheduled_sessions ss
                JOIN instructors i ON ss.mentor_id = i.user_id
                JOIN students s ON ss.mentee_id = s.user_id
                JOIN users u1 ON i.user_id = u1.uuid
                JOIN users u2 ON s.user_id = u2.uuid
                WHERE ss.status = ?
                AND NOT (
                    CONCAT(ss.session_date, ' ', ss.session_time) < NOW() - INTERVAL
                    CAST(SUBSTRING_INDEX(ss.duration, ' ', 1) AS UNSIGNED) MINUTE
                )
                ORDER BY ss.session_date DESC, ss.session_time DESC
                LIMIT ? OFFSET ?
            `;

            const [sessions] = await promisePool.query(query, [status, parseInt(limit), parseInt(offset)]);

            // Get total count
            const countQuery = `
                SELECT COUNT(*) as total
                FROM scheduled_sessions ss
                WHERE ss.status = ?
                AND NOT (
                    CONCAT(ss.session_date, ' ', ss.session_time) < NOW() - INTERVAL
                    CAST(SUBSTRING_INDEX(ss.duration, ' ', 1) AS UNSIGNED) MINUTE
                )
            `;
            const [countResult] = await promisePool.query(countQuery, [status]);

            return {
                sessions,
                total: countResult[0].total,
                limit: parseInt(limit),
                offset: parseInt(offset)
            };

        } catch (error) {
            console.error('Error in getSessionsByStatus service:', error);
            throw error;
        }
    }

    /**
     * Get past sessions (session date + duration has passed)
     */
    async getPastSessions(limit = 10, offset = 0) {
        try {
            const query = `
                SELECT ss.*,
                       i.first_name as instructor_first_name, i.last_name as instructor_last_name,
                       s.first_name as mentee_first_name, s.last_name as mentee_last_name,
                       u1.email as instructor_email, u2.email as mentee_email
                FROM scheduled_sessions ss
                JOIN instructors i ON ss.mentor_id = i.user_id
                JOIN students s ON ss.mentee_id = s.user_id
                JOIN users u1 ON i.user_id = u1.uuid
                JOIN users u2 ON s.user_id = u2.uuid
                WHERE CONCAT(ss.session_date, ' ', ss.session_time) < NOW() - INTERVAL
                      CAST(SUBSTRING_INDEX(ss.duration, ' ', 1) AS UNSIGNED) MINUTE
                ORDER BY ss.session_date DESC, ss.session_time DESC
                LIMIT ? OFFSET ?
            `;

            const [sessions] = await promisePool.query(query, [parseInt(limit), parseInt(offset)]);

            // Get total count
            const countQuery = `
                SELECT COUNT(*) as total
                FROM scheduled_sessions ss
                WHERE CONCAT(ss.session_date, ' ', ss.session_time) < NOW() - INTERVAL
                      CAST(SUBSTRING_INDEX(ss.duration, ' ', 1) AS UNSIGNED) MINUTE
            `;
            const [countResult] = await promisePool.query(countQuery);

            return {
                sessions,
                total: countResult[0].total,
                limit: parseInt(limit),
                offset: parseInt(offset)
            };

        } catch (error) {
            console.error('Error in getPastSessions service:', error);
            throw error;
        }
    }

    /**
     * Check if a session is in the past
     */
    async isSessionPast(session) {
        try {
            // Parse duration (e.g., "30 minutes" -> 30)
            const durationMatch = session.duration.match(/\d+/);
            const durationMinutes = durationMatch ? parseInt(durationMatch[0]) : 30;

            // Create session end time
            const sessionDateTime = new Date(`${session.session_date}T${session.session_time}`);
            const sessionEndTime = new Date(sessionDateTime.getTime() + durationMinutes * 60000);

            // Compare with current time
            return sessionEndTime < new Date();

        } catch (error) {
            console.error('Error in isSessionPast service:', error);
            throw error;
        }
    }

    /**
     * Cancel a session
     */
    async cancelSession(sessionId, adminId) {
        try {
            await promisePool.query(
                `UPDATE scheduled_sessions
                 SET status = 'cancelled', last_updated_by = ?, last_updated = NOW()
                 WHERE id = ?`,
                [adminId, sessionId]
            );

            return true;

        } catch (error) {
            console.error('Error in cancelSession service:', error);
            throw error;
        }
    }

    /**
     * Delete a session (soft delete)
     */
    async deleteSession(sessionId) {
        try {
            await promisePool.query(
                'DELETE FROM scheduled_sessions WHERE id = ?',
                [sessionId]
            );

            return true;

        } catch (error) {
            console.error('Error in deleteSession service:', error);
            throw error;
        }
    }

    /**
     * Get available instructors for a specific date/time
     */
    async getAvailableInstructors(date, time) {
        try {
            // Get day of week from date
            const dayOfWeek = new Date(date).toLocaleDateString('en-US', { weekday: 'long' });

            const query = `
                SELECT i.user_id, i.first_name, i.last_name, u.email,
                       ia.available_days, ia.start_time, ia.end_time
                FROM instructors i
                JOIN users u ON i.user_id = u.uuid
                LEFT JOIN instructor_availability ia ON i.user_id = ia.instructor_id
                WHERE i.status = 'active'
                AND i.is_deleted = 0
                AND (ia.is_active = 1 OR ia.is_active IS NULL)
                AND (ia.available_days LIKE ? OR ia.available_days IS NULL)
                AND (? >= ia.start_time AND ? < ia.end_time OR ia.start_time IS NULL)
            `;

            const [instructors] = await promisePool.query(query, [
                `%${dayOfWeek}%`,
                time,
                time
            ]);

            return instructors;

        } catch (error) {
            console.error('Error in getAvailableInstructors service:', error);
            throw error;
        }
    }

    /**
     * Get all instructors with availability info
     */
    async getAllInstructors() {
        try {
            const query = `
                SELECT i.user_id, i.first_name, i.last_name, u.email,
                       ia.available_days, ia.start_time, ia.end_time, ia.is_active
                FROM instructors i
                JOIN users u ON i.user_id = u.uuid
                LEFT JOIN instructor_availability ia ON i.user_id = ia.instructor_id
                WHERE i.status = 'active' AND i.is_deleted = 0
                ORDER BY i.first_name, i.last_name
            `;

            const [instructors] = await promisePool.query(query);

            return instructors;

        } catch (error) {
            console.error('Error in getAllInstructors service:', error);
            throw error;
        }
    }
}

module.exports = new AdminSessionService();
