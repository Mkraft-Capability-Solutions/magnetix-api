const { promisePool } = require('../../config/db');
const { AdminEventDTO, AdminEventAttendeeDTO } = require('../../dto/admin/event_dto');

class AdminEventService {
    
    // Create new event (admin can create events)
    async createEvent(creatorId, data) {
        if (!data.title) {
            throw new Error('Title is required');
        }

        const [result] = await promisePool.query(`
            INSERT INTO events (
                title,
                description,
                start_date,
                start_time,
                end_date,
                end_time,
                event_audience_type_id,
                speakers,
                event_category,
                event_thumbnail,
                online_event,
                event_venue,
                max_limit,
                url,
                creator_id,
                last_updated_by,
                created_date
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `, [
            data.title,
            data.description || '',
            data.startDate,
            data.startTime,
            data.endDate,
            data.endTime,
            data.eventAudienceTypeId,
            data.speakers || null,
            data.eventCategory || null,
            data.eventThumbnail || null,
            data.onlineEvent || 0,
            data.eventVenue || null,
            data.maxLimit,
            data.url || null,
            creatorId,
            creatorId
        ]);
        
        const eventId = result.insertId;
        
        // Handle individual target audience emails if provided
        if (data.eventAudienceTypeId === 1 && data.target_audience_emails) {
            await this.addTargetAudienceAttendees(eventId, data.target_audience_emails);
        }
        
        return eventId;
    }

    // Add target audience attendees for individual events
    async addTargetAudienceAttendees(eventId, emailsString) {
        const emails = emailsString.split(',').map(email => email.trim()).filter(email => email);
        
        for (const email of emails) {
            try {
                // Get user info by email
                const [userRows] = await promisePool.query(
                    'SELECT uuid, role_id FROM users WHERE email = ? AND is_deleted = 0',
                    [email]
                );
                
                if (userRows.length === 0) {
                    console.warn(`User not found for email: ${email}`);
                    continue;
                }
                
                const user = userRows[0];
                let recipientName = '';
                
                // Get user's name based on role
                if (user.role_id === 1) { // Student
                    const [studentRows] = await promisePool.query(
                        'SELECT first_name, last_name FROM students WHERE user_id = ?',
                        [user.uuid]
                    );
                    if (studentRows.length > 0) {
                        recipientName = `${studentRows[0].first_name} ${studentRows[0].last_name}`;
                    }
                } else if (user.role_id === 2) { // Instructor
                    const [instructorRows] = await promisePool.query(
                        'SELECT first_name, last_name FROM instructors WHERE user_id = ?',
                        [user.uuid]
                    );
                    if (instructorRows.length > 0) {
                        recipientName = `${instructorRows[0].first_name} ${instructorRows[0].last_name}`;
                    }
                } else if (user.role_id === 3) { // Admin
                    const [adminRows] = await promisePool.query(
                        'SELECT first_name, last_name FROM admins WHERE user_id = ?',
                        [user.uuid]
                    );
                    if (adminRows.length > 0) {
                        recipientName = `${adminRows[0].first_name} ${adminRows[0].last_name}`;
                    }
                } else if (user.role_id === 4) { // Super Admin
                    const [superAdminRows] = await promisePool.query(
                        'SELECT first_name, last_name FROM super_admins WHERE user_id = ?',
                        [user.uuid]
                    );
                    if (superAdminRows.length > 0) {
                        recipientName = `${superAdminRows[0].first_name} ${superAdminRows[0].last_name}`;
                    }
                }
                
                // Check if already registered
                const [existingRows] = await promisePool.query(
                    'SELECT id FROM event_attendees WHERE event_id = ? AND recipient_id = ?',
                    [eventId, user.uuid]
                );
                
                if (existingRows.length === 0) {
                    // Insert into event_attendees
                    await promisePool.query(
                        'INSERT INTO event_attendees (event_id, recipient_id, recipient_name, recipient_email, registered_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)',
                        [eventId, user.uuid, recipientName, email]
                    );
                    
                    // Update attendees count
                    await promisePool.query(
                        'UPDATE events SET attendees_count = attendees_count + 1 WHERE id = ?',
                        [eventId]
                    );
                }
                
            } catch (error) {
                console.error(`Error processing email ${email}:`, error);
                // Continue processing other emails even if one fails
            }
        }
    }

    // Update target audience attendees for individual events
    async updateTargetAudienceAttendees(eventId, emailsString) {
        // First, remove existing manually added attendees for this event
        // We'll keep only those that were registered through the public registration process
        await promisePool.query(
            'DELETE FROM event_attendees WHERE event_id = ? AND recipient_name IS NOT NULL AND recipient_email IS NOT NULL',
            [eventId]
        );
        
        // Reset attendees count to only count remaining attendees
        const [remainingAttendees] = await promisePool.query(
            'SELECT COUNT(*) as count FROM event_attendees WHERE event_id = ?',
            [eventId]
        );
        
        await promisePool.query(
            'UPDATE events SET attendees_count = ? WHERE id = ?',
            [remainingAttendees[0].count, eventId]
        );
        
        // Add new target audience attendees
        if (emailsString && emailsString.trim()) {
            await this.addTargetAudienceAttendees(eventId, emailsString);
        }
    }
    
    // Get all upcoming events created by other users (not current admin)
    async getAllUpcomingEvents(adminId, limit = 10, offset = 0) {
        const [rows] = await promisePool.query(`
            SELECT 
                e.id,
                e.title,
                e.description,
                e.start_date,
                e.start_time,
                e.end_date,
                e.end_time,
                e.event_audience_type_id,
                e.speakers,
                e.event_category,
                e.event_thumbnail,
                e.online_event,
                e.event_venue,
                e.max_limit,
                e.attendees_count,
                e.url,
                e.created_date,
                e.last_updated,
                e.creator_id,
                e.is_deleted,
                CASE 
                    WHEN i.user_id IS NOT NULL THEN CONCAT(i.first_name, ' ', i.last_name)
                    WHEN a.user_id IS NOT NULL THEN CONCAT(a.first_name, ' ', a.last_name)
                    WHEN sa.user_id IS NOT NULL THEN CONCAT(sa.first_name, ' ', sa.last_name)
                    ELSE 'Unknown Creator'
                END as creator_name
            FROM events e
            LEFT JOIN instructors i ON e.creator_id = i.user_id
            LEFT JOIN admins a ON e.creator_id = a.user_id
            LEFT JOIN super_admins sa ON e.creator_id = sa.user_id
            WHERE e.is_deleted = 0 
            AND (
                (e.start_date > CURDATE()) 
                OR (e.start_date = CURDATE() AND e.start_time > CURTIME())
            )
            ORDER BY e.start_date ASC, e.start_time ASC
            LIMIT ? OFFSET ?
        `, [limit, offset]);
        
        return rows.map(row => new AdminEventDTO(row));
    }

    // Get all past events created by other users (not current admin)
    async getAllPastEvents(adminId, limit = 10, offset = 0) {
        const [rows] = await promisePool.query(`
            SELECT 
                e.id,
                e.title,
                e.description,
                e.start_date,
                e.start_time,
                e.end_date,
                e.end_time,
                e.event_audience_type_id,
                e.speakers,
                e.event_category,
                e.event_thumbnail,
                e.online_event,
                e.event_venue,
                e.max_limit,
                e.attendees_count,
                e.url,
                e.created_date,
                e.last_updated,
                e.creator_id,
                e.is_deleted,
                CASE 
                    WHEN i.user_id IS NOT NULL THEN CONCAT(i.first_name, ' ', i.last_name)
                    WHEN a.user_id IS NOT NULL THEN CONCAT(a.first_name, ' ', a.last_name)
                    WHEN sa.user_id IS NOT NULL THEN CONCAT(sa.first_name, ' ', sa.last_name)
                    ELSE 'Unknown Creator'
                END as creator_name
            FROM events e
            LEFT JOIN instructors i ON e.creator_id = i.user_id
            LEFT JOIN admins a ON e.creator_id = a.user_id
            LEFT JOIN super_admins sa ON e.creator_id = sa.user_id
            WHERE e.is_deleted = 0 
            AND e.creator_id != ?
            AND (
                (e.end_date < CURDATE()) 
                OR (e.end_date = CURDATE() AND e.end_time < CURTIME())
            )
            ORDER BY e.start_date DESC, e.start_time DESC
            LIMIT ? OFFSET ?
        `, [adminId, limit, offset]);
        
        return rows.map(row => new AdminEventDTO(row));
    }

    // Get admin's own upcoming events
    async getMyUpcomingEvents(adminId, limit = 10, offset = 0) {
        const [rows] = await promisePool.query(`
            SELECT 
                e.id,
                e.title,
                e.description,
                e.start_date,
                e.start_time,
                e.end_date,
                e.end_time,
                e.event_audience_type_id,
                e.speakers,
                e.event_category,
                e.event_thumbnail,
                e.online_event,
                e.event_venue,
                e.max_limit,
                e.attendees_count,
                e.url,
                e.created_date,
                e.last_updated,
                e.creator_id,
                e.is_deleted,
                CONCAT(a.first_name, ' ', a.last_name) as creator_name
            FROM events e
            INNER JOIN admins a ON e.creator_id = a.user_id
            WHERE e.is_deleted = 0 
            AND e.creator_id = ?
            AND (
                (e.start_date > CURDATE()) 
                OR (e.start_date = CURDATE() AND e.start_time > CURTIME())
            )
            ORDER BY e.start_date ASC, e.start_time ASC
            LIMIT ? OFFSET ?
        `, [adminId, limit, offset]);
        
        return rows.map(row => new AdminEventDTO(row));
    }

    // Get admin's own past events
    async getMyPastEvents(adminId, limit = 10, offset = 0) {
        const [rows] = await promisePool.query(`
            SELECT 
                e.id,
                e.title,
                e.description,
                e.start_date,
                e.start_time,
                e.end_date,
                e.end_time,
                e.event_audience_type_id,
                e.speakers,
                e.event_category,
                e.event_thumbnail,
                e.online_event,
                e.event_venue,
                e.max_limit,
                e.attendees_count,
                e.url,
                e.created_date,
                e.last_updated,
                e.creator_id,
                e.is_deleted,
                CONCAT(a.first_name, ' ', a.last_name) as creator_name
            FROM events e
            INNER JOIN admins a ON e.creator_id = a.user_id
            WHERE e.is_deleted = 0 
            AND e.creator_id = ?
            AND (
                (e.end_date < CURDATE()) 
                OR (e.end_date = CURDATE() AND e.end_time < CURTIME())
            )
            ORDER BY e.start_date DESC, e.start_time DESC
            LIMIT ? OFFSET ?
        `, [adminId, limit, offset]);
        
        return rows.map(row => new AdminEventDTO(row));
    }

    // Update any event (admin can update any event)
    async updateEvent(eventId, data) {
        await promisePool.query(`
            UPDATE events 
            SET 
                title = ?,
                description = ?,
                start_date = ?,
                start_time = ?,
                end_date = ?,
                end_time = ?,
                event_audience_type_id = ?,
                speakers = ?,
                event_category = ?,
                event_thumbnail = IFNULL(?, event_thumbnail),
                online_event = ?,
                event_venue = ?,
                max_limit = ?,
                url = ?,
                last_updated = CURRENT_TIMESTAMP
            WHERE id = ? AND is_deleted = 0
        `, [
            data.title,
            data.description,
            data.startDate,
            data.startTime,
            data.endDate,
            data.endTime,
            data.eventAudienceTypeId,
            data.speakers || null,
            data.eventCategory || null,
            data.eventThumbnail || null,
            data.onlineEvent || 0,
            data.eventVenue || null,
            data.maxLimit,
            data.url || null,
            eventId
        ]);

        return true;
    }

    // Delete any event (admin can delete any event)
    async deleteEvent(eventId) {
        await promisePool.query(
            'UPDATE events SET is_deleted = 1, last_updated = CURRENT_TIMESTAMP WHERE id = ?',
            [eventId]
        );
        return true;
    }

    // Get event by ID (for any event)
    async getEventById(eventId) {
        const [rows] = await promisePool.query(`
            SELECT 
                e.id,
                e.title,
                e.description,
                e.start_date,
                e.start_time,
                e.end_date,
                e.end_time,
                e.event_audience_type_id,
                e.speakers,
                e.event_category,
                e.event_thumbnail,
                e.online_event,
                e.event_venue,
                e.max_limit,
                e.attendees_count,
                e.url,
                e.created_date,
                e.last_updated,
                e.creator_id,
                e.is_deleted,
                CASE 
                    WHEN i.user_id IS NOT NULL THEN CONCAT(i.first_name, ' ', i.last_name)
                    WHEN a.user_id IS NOT NULL THEN CONCAT(a.first_name, ' ', a.last_name)
                    WHEN sa.user_id IS NOT NULL THEN CONCAT(sa.first_name, ' ', sa.last_name)
                    ELSE 'Unknown Creator'
                END as creator_name
            FROM events e
            LEFT JOIN instructors i ON e.creator_id = i.user_id
            LEFT JOIN admins a ON e.creator_id = a.user_id
            LEFT JOIN super_admins sa ON e.creator_id = sa.user_id
            WHERE e.id = ? AND e.is_deleted = 0
        `, [eventId]);
        
        if (rows.length > 0) {
            return new AdminEventDTO(rows[0]);
        }
        return null;
    }

    // Get event attendees (for any event)
    async getEventAttendees(eventId) {
        const [rows] = await promisePool.query(`
            SELECT 
                ea.id,
                ea.event_id,
                ea.recipient_id,
                ea.recipient_name,
                ea.recipient_email,
                ea.registered_at
            FROM event_attendees ea
            INNER JOIN events e ON ea.event_id = e.id
            WHERE ea.event_id = ? AND e.is_deleted = 0
            ORDER BY ea.registered_at DESC
        `, [eventId]);
        
        return rows.map(row => new AdminEventAttendeeDTO(row));
    }

    // Bulk enroll students in an event
    async bulkEnrollStudents(eventId, emails) {
        const results = {
            enrolled: 0,
            skipped: 0,
            errors: []
        };

        // Get event details for email notifications
        const event = await this.getEventById(eventId);
        if (!event) {
            throw new Error('Event not found');
        }

        const emailHelper = require('../../utils/email_helper');

        for (const email of emails) {
            try {
                // Get user info by email
                const [userRows] = await promisePool.query(
                    'SELECT uuid, role_id FROM users WHERE email = ? AND is_deleted = 0',
                    [email]
                );
                
                if (userRows.length === 0) {
                    results.errors.push(`User not found for email: ${email}`);
                    results.skipped++;
                    continue;
                }
                
                const user = userRows[0];
                
                // Only allow students to be enrolled via bulk enrollment
                if (user.role_id !== 1) {
                    results.errors.push(`${email} is not a student account`);
                    results.skipped++;
                    continue;
                }

                let recipientName = '';
                
                // Get student's name
                const [studentRows] = await promisePool.query(
                    'SELECT first_name, last_name FROM students WHERE user_id = ?',
                    [user.uuid]
                );
                if (studentRows.length > 0) {
                    recipientName = `${studentRows[0].first_name} ${studentRows[0].last_name}`;
                }
                
                // Check if already registered
                const [existingRows] = await promisePool.query(
                    'SELECT id FROM event_attendees WHERE event_id = ? AND recipient_id = ?',
                    [eventId, user.uuid]
                );
                
                if (existingRows.length === 0) {
                    // Insert into event_attendees
                    await promisePool.query(
                        'INSERT INTO event_attendees (event_id, recipient_id, recipient_name, recipient_email, registered_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)',
                        [eventId, user.uuid, recipientName, email]
                    );
                    
                    // Update attendees count
                    await promisePool.query(
                        'UPDATE events SET attendees_count = attendees_count + 1 WHERE id = ?',
                        [eventId]
                    );

                    // Send registration confirmation email
                    try {
                        const firstName = studentRows[0]?.first_name || 'Student';
                        await emailHelper.sendBulkEventRegistrationEmail(email, firstName, event);
                    } catch (emailError) {
                        console.error(`Failed to send email to ${email}:`, emailError);
                        // Don't fail the enrollment if email fails
                    }

                    results.enrolled++;
                } else {
                    results.errors.push(`${email} is already enrolled in this event`);
                    results.skipped++;
                }
                
            } catch (error) {
                console.error(`Error processing email ${email}:`, error);
                results.errors.push(`Failed to process ${email}: ${error.message}`);
                results.skipped++;
            }
        }

        return results;
    }
}

module.exports = new AdminEventService();