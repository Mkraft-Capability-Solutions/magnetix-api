const { promisePool } = require('../../config/db');
const { EventDTO, EventAttendeeDTO } = require('../../dto/instructor/event_dto');

class InstructorEventService {
    async createEvent(creatorId, data) {
        try {
            console.log('CreateEvent Service - Input data:', data);
            
            // Validate required fields
            if (!data || !data.title) {
                throw new Error('Title is required');
            }
            if (!data.startDate) {
                throw new Error('Start date is required');
            }
            if (!data.startTime) {
                throw new Error('Start time is required');
            }
            if (!data.endDate) {
                throw new Error('End date is required');
            }
            if (!data.endTime) {
                throw new Error('End time is required');
            }
            if (!data.eventAudienceTypeId) {
                throw new Error('Event audience type is required');
            }
            if (!data.maxLimit) {
                throw new Error('Max limit is required');
            }

            // Convert boolean values properly
            const onlineEvent = data.onlineEvent === 'true' || data.onlineEvent === '1' || data.onlineEvent === 1 || data.onlineEvent === true ? 1 : 0;

            const params = [
                creatorId,
                data.title || '',
                data.description || '',
                data.startDate,
                data.startTime,
                data.endDate,
                data.endTime,
                parseInt(data.eventAudienceTypeId),
                data.speakers || '',
                data.eventCategory || '',
                data.eventThumbnail || '',
                onlineEvent,
                onlineEvent === 1 ? null : (data.eventVenue || ''),
                parseInt(data.maxLimit),
                data.url || ''
            ];

            console.log('CreateEvent Service - Parameters:', params);
            console.log('Parameter types:', params.map(p => typeof p));

            let eventId;
            
            try {
                const [result] = await promisePool.query(
                    'CALL instructor_create_event(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    params
                );
                
                console.log('CreateEvent Service - Raw result:', result);
                
                if (!result || !result[0] || !result[0][0] || !result[0][0].event_id) {
                    throw new Error('No event ID returned from stored procedure');
                }
                
                eventId = result[0][0].event_id;
                console.log('CreateEvent Service - Event ID:', eventId);
                
            } catch (dbError) {
                console.error('Database error in createEvent:', dbError);
                throw new Error(`Database error: ${dbError.message}`);
            }
            
            // Handle individual target audience emails if provided
            if (parseInt(data.eventAudienceTypeId) === 1 && data.target_audience_emails) {
                try {
                    await this.addTargetAudienceAttendees(eventId, data.target_audience_emails);
                } catch (emailError) {
                    console.error('Error adding target audience emails:', emailError);
                    // Don't fail the entire event creation if email processing fails
                }
            }
            
            return eventId;
        } catch (error) {
            console.error('CreateEvent Service - Error:', error);
            throw error;
        }
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
        try {
            // Try using the stored procedure first
            const [rows] = await promisePool.query(
                'CALL instructor_get_event_by_id(?, ?)',
                [creatorId, eventId]
            );
            
            if (rows[0] && rows[0].length > 0) {
                return new EventDTO(rows[0][0]);
            }
        } catch (error) {
            console.log('Stored procedure failed, falling back to direct query:', error.message);
            
            // Fallback to direct SQL query
            const [rows] = await promisePool.query(
                `SELECT 
                    e.id,
                    e.start_date,
                    e.start_time,
                    e.title,
                    e.url,
                    e.description,
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
                    e.created_date,
                    e.last_updated
                FROM events e
                WHERE e.id = ? 
                AND e.creator_id = ? 
                AND e.is_deleted = 0`,
                [eventId, creatorId]
            );
            
            if (rows && rows.length > 0) {
                return new EventDTO(rows[0]);
            }
        }
        
        return null;
    }

    async updateEvent(creatorId, eventId, data) {
        try {
            console.log('UpdateEvent Service - Input data:', data);
            
            // Validate required fields
            if (!data || !data.title) {
                throw new Error('Title is required');
            }
            if (!eventId) {
                throw new Error('Event ID is required');
            }
            if (!data.startDate) {
                throw new Error('Start date is required');
            }
            if (!data.startTime) {
                throw new Error('Start time is required');
            }
            if (!data.endDate) {
                throw new Error('End date is required');
            }
            if (!data.endTime) {
                throw new Error('End time is required');
            }
            if (!data.eventAudienceTypeId) {
                throw new Error('Event audience type is required');
            }
            if (!data.maxLimit) {
                throw new Error('Max limit is required');
            }

            // Convert boolean values properly
            const onlineEvent = data.onlineEvent === 'true' || data.onlineEvent === '1' || data.onlineEvent === 1 || data.onlineEvent === true ? 1 : 0;

            const params = [
                creatorId,
                parseInt(eventId),
                data.title,
                data.description,
                data.startDate,
                data.startTime,
                data.endDate,
                data.endTime,
                parseInt(data.eventAudienceTypeId),
                data.speakers || null,
                data.eventCategory || null,
                data.eventThumbnail || null,
                onlineEvent,
                data.eventVenue || null,
                parseInt(data.maxLimit),
                data.url || null
            ];

            console.log('UpdateEvent Service - Parameters:', params);
            console.log('Parameter types:', params.map(p => typeof p));

            try {
                // Try using the stored procedure first
                await promisePool.query(
                    'CALL instructor_update_event(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', 
                    params
                );
                console.log('UpdateEvent Service - Event updated successfully via stored procedure');
            } catch (spError) {
                console.error('Stored procedure failed in updateEvent:', spError);
                throw new Error(`Database error: ${spError.message}`);
            }
        } catch (error) {
            console.log('Stored procedure failed, falling back to direct query:', error.message);
            
            // Convert boolean values properly for fallback
            const onlineEvent = data.onlineEvent === 'true' || data.onlineEvent === '1' || data.onlineEvent === 1 || data.onlineEvent === true ? 1 : 0;

            // Fallback to direct SQL query
            const [result] = await promisePool.query(
                `UPDATE events SET
                    title = ?,
                    description = ?,
                    start_date = ?,
                    start_time = ?,
                    end_date = ?,
                    end_time = ?,
                    event_audience_type_id = ?,
                    speakers = ?,
                    event_category = ?,
                    event_thumbnail = CASE 
                        WHEN ? IS NOT NULL AND ? != '' THEN ?
                        ELSE event_thumbnail 
                    END,
                    online_event = ?,
                    event_venue = CASE 
                        WHEN ? = 1 THEN NULL 
                        ELSE ? 
                    END,
                    max_limit = ?,
                    url = ?,
                    last_updated = CURRENT_TIMESTAMP
                WHERE id = ? AND creator_id = ? AND is_deleted = 0`,
                [
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
                    data.eventThumbnail || null,
                    data.eventThumbnail || null,
                    onlineEvent,
                    onlineEvent,
                    data.eventVenue || null,
                    data.maxLimit,
                    data.url || null,
                    eventId,
                    creatorId
                ]
            );
            
            if (result.affectedRows === 0) {
                throw new Error('Event not found or unauthorized');
            }
        }

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
        try {
            const [rows] = await promisePool.query(
                'CALL instructor_get_my_upcoming_events(?, ?, ?)',
                [creatorId, limit, offset]
            );
            return rows[0].map(row => new EventDTO(row));
        } catch (error) {
            console.log('Stored procedure failed, falling back to direct query for upcoming events:', error.message);
            
            // Fallback to direct SQL query
            const [rows] = await promisePool.query(
                `SELECT 
                    e.id,
                    e.start_date,
                    e.start_time,
                    e.title,
                    e.url,
                    e.description,
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
                    e.created_date,
                    e.last_updated
                FROM events e
                WHERE e.creator_id = ? 
                AND e.is_deleted = 0
                AND CONCAT(e.start_date, ' ', e.start_time) >= NOW()
                ORDER BY e.start_date ASC, e.start_time ASC
                LIMIT ? OFFSET ?`,
                [creatorId, limit, offset]
            );
            
            return rows.map(row => new EventDTO(row));
        }
    }

    async getMyPastEvents(creatorId, limit = 10, offset = 0) {
        try {
            const [rows] = await promisePool.query(
                'CALL instructor_get_my_past_events(?, ?, ?)',
                [creatorId, limit, offset]
            );
            return rows[0].map(row => new EventDTO(row));
        } catch (error) {
            console.log('Stored procedure failed, falling back to direct query for past events:', error.message);
            
            // Fallback to direct SQL query
            const [rows] = await promisePool.query(
                `SELECT 
                    e.id,
                    e.start_date,
                    e.start_time,
                    e.title,
                    e.url,
                    e.description,
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
                    e.created_date,
                    e.last_updated
                FROM events e
                WHERE e.creator_id = ? 
                AND e.is_deleted = 0
                AND CONCAT(e.start_date, ' ', e.start_time) < NOW()
                ORDER BY e.start_date DESC, e.start_time DESC
                LIMIT ? OFFSET ?`,
                [creatorId, limit, offset]
            );
            
            return rows.map(row => new EventDTO(row));
        }
    }

    async getEventAttendees(eventId) {
        try {
            const [rows] = await promisePool.query(
                'CALL instructor_get_event_attendees(?)',
                [eventId]
            );
            return rows[0].map(row => new EventAttendeeDTO(row));
        } catch (error) {
            console.log('Stored procedure failed, falling back to direct query for event attendees:', error.message);
            
            // Fallback to direct SQL query
            const [rows] = await promisePool.query(
                `SELECT 
                    ea.id,
                    ea.event_id,
                    ea.recipient_id,
                    ea.registered_at,
                    COALESCE(
                        CONCAT(s.first_name, ' ', s.last_name),
                        CONCAT(i.first_name, ' ', i.last_name),
                        'Unknown User'
                    ) as recipient_name,
                    COALESCE(s.email, i.email, 'no-email@example.com') as recipient_email
                FROM event_attendees ea
                LEFT JOIN students s ON ea.recipient_id = s.user_id
                LEFT JOIN instructors i ON ea.recipient_id = i.user_id
                WHERE ea.event_id = ?
                ORDER BY ea.registered_at DESC`,
                [eventId]
            );
            
            return rows.map(row => new EventAttendeeDTO(row));
        }
    }
}

module.exports = new InstructorEventService();