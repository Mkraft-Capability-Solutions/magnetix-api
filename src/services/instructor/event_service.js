const { promisePool } = require('../../config/db');
const { EventDTO, EventAttendeeDTO } = require('../../dto/instructor/event_dto');

class InstructorEventService {
    async createEvent(creatorId, data) {
        if (!data.title) {
            throw new Error('Title is required');
        }

        const [result] = await promisePool.query(
            'CALL instructor_create_event(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
                creatorId,
                data.title,
                data.description,
                data.startDate,
                data.startTime,
                data.endDate,
                data.endTime,
                data.eventAudienceTypeId,
                data.speakers,
                data.eventCategory,
                data.eventThumbnail,
                data.onlineEvent || 0,
                data.eventVenue,
                data.maxLimit,
                data.url
            ]
        );
        
        const eventId = result[0][0].event_id;
        
        // Handle individual target audience emails if provided
        if (data.eventAudienceTypeId === 1 && data.target_audience_emails) {
            await this.addTargetAudienceAttendees(eventId, data.target_audience_emails);
        }
        
        return eventId;
    }

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

    async getEventById(creatorId, eventId) {
        const [rows] = await promisePool.query(
            'CALL instructor_get_event_by_id(?, ?)',
            [creatorId, eventId]
        );
        
        if (rows[0] && rows[0].length > 0) {
            return new EventDTO(rows[0][0]);
        }
        return null;
    }

    async updateEvent(creatorId, eventId, data) {
        await promisePool.query(
            'CALL instructor_update_event(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', 
            [
                creatorId,
                eventId,
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
                data.url || null
            ]
        );

            return true;
        }

    async deleteEvent(creatorId, eventId) {
        await promisePool.query(
            'CALL instructor_delete_event(?, ?)',
            [creatorId, eventId]
        );
        return true;
    }

    async getMyUpcomingEvents(creatorId, limit = 10, offset = 0) {
        const [rows] = await promisePool.query(
            'CALL instructor_get_my_upcoming_events(?, ?, ?)',
            [creatorId, limit, offset]
        );
        return rows[0].map(row => new EventDTO(row));
    }

    async getMyPastEvents(creatorId, limit = 10, offset = 0) {
        const [rows] = await promisePool.query(
            'CALL instructor_get_my_past_events(?, ?, ?)',
            [creatorId, limit, offset]
        );
        return rows[0].map(row => new EventDTO(row));
    }

    async getEventAttendees(eventId) {
        const [rows] = await promisePool.query(
            'CALL instructor_get_event_attendees(?)',
            [eventId]
        );
        return rows[0].map(row => new EventAttendeeDTO(row));
    }
}

module.exports = new InstructorEventService();