const { promisePool } = require('../config/db');
const emailHelper = require('../utils/email_helper');

class EventReminderService {
    
    // Get events that are starting within the next 48 hours
    async getEventsStartingWithin48Hours() {
        try {
            const [rows] = await promisePool.query(`
                SELECT 
                    e.id,
                    e.title,
                    e.description,
                    e.start_date,
                    e.start_time,
                    e.end_date,
                    e.end_time,
                    e.speakers,
                    e.event_category,
                    e.event_thumbnail,
                    e.online_event,
                    e.event_venue,
                    e.max_limit,
                    e.attendees_count,
                    e.url,
                    e.created_date,
                    TIMESTAMPDIFF(HOUR, NOW(), TIMESTAMP(e.start_date, e.start_time)) as hours_until_event
                FROM events e
                WHERE e.is_deleted = 0
                AND TIMESTAMP(e.start_date, e.start_time) > NOW()
                AND TIMESTAMP(e.start_date, e.start_time) <= DATE_ADD(NOW(), INTERVAL 48 HOUR)
                AND e.attendees_count > 0
                ORDER BY e.start_date ASC, e.start_time ASC
            `);
            
            console.log(`Found ${rows.length} events starting within 48 hours`);
            return rows;
            
        } catch (error) {
            console.error('Error getting events starting within 48 hours:', error);
            throw error;
        }
    }

    // Get all attendees for a specific event who have opted in for notifications
    async getEventAttendees(eventId) {
        try {
            const [rows] = await promisePool.query(`
                SELECT
                    ea.recipient_id,
                    ea.recipient_name,
                    ea.recipient_email,
                    u.role_id
                FROM event_attendees ea
                INNER JOIN users u ON ea.recipient_id = u.uuid
                WHERE ea.event_id = ?
                AND u.is_deleted = 0
                AND ea.send_notification = 1
                ORDER BY ea.registered_at ASC
            `, [eventId]);

            console.log(`Found ${rows.length} attendees for event ${eventId} who opted in for notifications`);
            return rows;

        } catch (error) {
            console.error(`Error getting attendees for event ${eventId}:`, error);
            throw error;
        }
    }

    // Get user's first name based on their role
    async getUserFirstName(userId, roleId) {
        try {
            let tableName;
            
            switch (roleId) {
                case 1: // Student
                    tableName = 'students';
                    break;
                case 2: // Instructor
                    tableName = 'instructors';
                    break;
                case 3: // Admin
                    tableName = 'admins';
                    break;
                case 4: // Super Admin
                    tableName = 'super_admins';
                    break;
                default:
                    return 'User'; // Default fallback
            }
            
            const [rows] = await promisePool.query(
                `SELECT first_name FROM ${tableName} WHERE user_id = ?`,
                [userId]
            );
            
            return rows.length > 0 ? rows[0].first_name : 'User';
            
        } catch (error) {
            console.error(`Error getting user name for ${userId}:`, error);
            return 'User'; // Fallback on error
        }
    }

    // Check if reminder has already been sent for this event today
    async hasReminderBeenSent(eventId) {
        try {
            const [rows] = await promisePool.query(`
                SELECT id FROM event_reminder_logs 
                WHERE event_id = ? 
                AND DATE(sent_at) = CURDATE()
            `, [eventId]);
            
            return rows.length > 0;
            
        } catch (error) {
            // If table doesn't exist, we'll create it later
            if (error.code === 'ER_NO_SUCH_TABLE') {
                await this.createReminderLogsTable();
                return false;
            }
            console.error(`Error checking reminder log for event ${eventId}:`, error);
            return false; // Assume not sent on error
        }
    }

    // Create the event_reminder_logs table if it doesn't exist
    async createReminderLogsTable() {
        try {
            await promisePool.query(`
                CREATE TABLE IF NOT EXISTS event_reminder_logs (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    event_id INT NOT NULL,
                    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    total_recipients INT DEFAULT 0,
                    successful_sends INT DEFAULT 0,
                    failed_sends INT DEFAULT 0,
                    INDEX idx_event_sent_date (event_id, sent_at)
                )
            `);
            console.log('Created event_reminder_logs table');
        } catch (error) {
            console.error('Error creating reminder logs table:', error);
        }
    }

    // Log the reminder sending activity
    async logReminderActivity(eventId, totalRecipients, successfulSends, failedSends) {
        try {
            await promisePool.query(`
                INSERT INTO event_reminder_logs (event_id, total_recipients, successful_sends, failed_sends)
                VALUES (?, ?, ?, ?)
            `, [eventId, totalRecipients, successfulSends, failedSends]);
            
        } catch (error) {
            console.error('Error logging reminder activity:', error);
        }
    }

    // Send reminder emails for a specific event
    async sendRemindersForEvent(event) {
        try {
            // Check if reminders have already been sent today
            const alreadySent = await this.hasReminderBeenSent(event.id);
            if (alreadySent) {
                console.log(`Reminders already sent today for event: ${event.title}`);
                return { skipped: true, reason: 'Already sent today' };
            }

            // Get all attendees for this event
            const attendees = await this.getEventAttendees(event.id);
            
            if (attendees.length === 0) {
                console.log(`No attendees found for event: ${event.title}`);
                return { skipped: true, reason: 'No attendees' };
            }

            let successfulSends = 0;
            let failedSends = 0;
            const errors = [];

            console.log(`Sending reminders for event: ${event.title} to ${attendees.length} attendees`);

            // Send reminder email to each attendee
            for (const attendee of attendees) {
                try {
                    // Get attendee's first name
                    const firstName = await this.getUserFirstName(attendee.recipient_id, attendee.role_id);
                    
                    // Send reminder email
                    await emailHelper.sendEventReminderEmail(
                        attendee.recipient_email, 
                        firstName, 
                        event
                    );
                    
                    successfulSends++;
                    console.log(`Reminder sent to: ${attendee.recipient_email}`);
                    
                } catch (emailError) {
                    failedSends++;
                    const errorMsg = `Failed to send reminder to ${attendee.recipient_email}: ${emailError.message}`;
                    console.error(errorMsg);
                    errors.push(errorMsg);
                }
                
                // Add small delay between emails to avoid overwhelming the email service
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            // Log the reminder activity
            await this.logReminderActivity(event.id, attendees.length, successfulSends, failedSends);

            console.log(`Reminder summary for "${event.title}": ${successfulSends} sent, ${failedSends} failed`);

            return {
                eventId: event.id,
                eventTitle: event.title,
                totalAttendees: attendees.length,
                successfulSends,
                failedSends,
                errors
            };

        } catch (error) {
            console.error(`Error sending reminders for event ${event.id}:`, error);
            throw error;
        }
    }

    // Main method to process all events that need reminders
    async processEventReminders() {
        try {
            console.log('Starting event reminder processing...');
            
            // Get events starting within 48 hours
            const events = await this.getEventsStartingWithin48Hours();
            
            if (events.length === 0) {
                console.log('No events found that need reminders');
                return { totalEvents: 0, results: [] };
            }

            const results = [];
            let totalSuccessfulSends = 0;
            let totalFailedSends = 0;

            // Process each event
            for (const event of events) {
                try {
                    const result = await this.sendRemindersForEvent(event);
                    results.push(result);
                    
                    if (!result.skipped) {
                        totalSuccessfulSends += result.successfulSends;
                        totalFailedSends += result.failedSends;
                    }
                    
                } catch (error) {
                    console.error(`Failed to process reminders for event ${event.id}:`, error);
                    results.push({
                        eventId: event.id,
                        eventTitle: event.title,
                        error: error.message,
                        failed: true
                    });
                }
            }

            console.log(`Event reminder processing completed. Total: ${totalSuccessfulSends} sent, ${totalFailedSends} failed`);

            return {
                totalEvents: events.length,
                totalSuccessfulSends,
                totalFailedSends,
                results
            };

        } catch (error) {
            console.error('Error in event reminder processing:', error);
            throw error;
        }
    }

    // Manual trigger method for testing
    async triggerManualReminder(eventId) {
        try {
            console.log(`Manual reminder trigger for event ID: ${eventId}`);
            
            const [eventRows] = await promisePool.query(`
                SELECT 
                    e.id,
                    e.title,
                    e.description,
                    e.start_date,
                    e.start_time,
                    e.end_date,
                    e.end_time,
                    e.speakers,
                    e.event_category,
                    e.event_thumbnail,
                    e.online_event,
                    e.event_venue,
                    e.max_limit,
                    e.attendees_count,
                    e.url,
                    e.created_date
                FROM events e
                WHERE e.id = ? AND e.is_deleted = 0
            `, [eventId]);
            
            if (eventRows.length === 0) {
                throw new Error('Event not found or deleted');
            }
            
            const event = eventRows[0];
            const result = await this.sendRemindersForEvent(event);
            
            return result;
            
        } catch (error) {
            console.error(`Error in manual reminder trigger:`, error);
            throw error;
        }
    }
}

module.exports = new EventReminderService();