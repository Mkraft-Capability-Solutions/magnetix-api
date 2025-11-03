const { promisePool } = require('../../config/db');
const { MentorshipRequestDTO, MenteeDTO, SessionRequestDTO } = require('../../dto/instructor/mentorship_dto');
const googleMeetService = require('../google/google_meet_service');
const emailHelper = require('../../utils/email_helper');

class InstructorMentorshipService {
    async getMentorshipRequests(mentorId, limit = 10, offset = 0) {
        const [rows] = await promisePool.query(
            'CALL instructor_get_mentorship_requests(?, ?, ?)',
            [mentorId, limit, offset]
        );
        return rows[0].map(row => new MentorshipRequestDTO(row));
    }

    async approveMentorshipRequest(mentorId, mentorshipId) {
        try {
            // 1️⃣ Get mentorship details before approving
            const [mentorshipRows] = await promisePool.query(
                `SELECT m.menteeId, m.mentorId,
                        s.first_name as mentee_first_name, s.last_name as mentee_last_name,
                        us.email as mentee_email,
                        i.first_name as mentor_first_name, i.last_name as mentor_last_name,
                        ui.email as mentor_email, i.expertise as mentor_expertise
                 FROM mentorship m
                 JOIN students s ON m.menteeId = s.user_id
                 JOIN users us ON s.user_id = us.uuid
                 JOIN instructors i ON m.mentorId = i.user_id
                 JOIN users ui ON i.user_id = ui.uuid
                 WHERE m.id = ? AND m.mentorId = ?`,
                [mentorshipId, mentorId]
            );

            if (!mentorshipRows || mentorshipRows.length === 0) {
                throw new Error('Mentorship request not found');
            }

            const mentorshipData = mentorshipRows[0];

            // 2️⃣ Approve the mentorship request
            await promisePool.query(
                'CALL instructor_approve_mentorship_request(?, ?)',
                [mentorId, mentorshipId]
            );

            // 3️⃣ Send email notification to mentee
            await emailHelper.sendMentorshipApprovedEmail(
                mentorshipData.mentee_email,
                mentorshipData.mentee_first_name,
                {
                    mentorName: `${mentorshipData.mentor_first_name} ${mentorshipData.mentor_last_name}`,
                    mentorEmail: mentorshipData.mentor_email,
                    mentorExpertise: mentorshipData.mentor_expertise
                }
            );

            console.log(`✅ Mentorship approved and email sent to ${mentorshipData.mentee_email}`);
            return true;

        } catch (error) {
            console.error('Error approving mentorship request:', error);
            throw error;
        }
    }

    async rejectMentorshipRequest(mentorId, mentorshipId) {
        const [result] = await promisePool.query(
            'CALL instructor_reject_mentorship_request(?, ?)',
            [mentorId, mentorshipId]
        );
        if (result[0][0].success) {
            return true;
        }
        throw new Error('Failed to reject mentorship request');
    }

    async getAllMentees(mentorId, limit = 10, offset = 0) {
        const [rows] = await promisePool.query(
            'CALL instructor_get_all_mentees(?, ?, ?)',
            [mentorId, limit, offset]
        );
        return rows[0].map(row => new MenteeDTO(row));
    }

    async getScheduleSessionRequests(mentorId, limit = 10, offset = 0) {
        const [rows] = await promisePool.query(
            'CALL instructor_get_schedule_session_requests(?, ?, ?)',
            [mentorId, limit, offset]
        );
        return rows[0].map(row => new SessionRequestDTO(row));
    }

    async approveSessionRequest(mentorId, sessionId) {
        try {
            console.log(`🔍 Starting session approval process. Session ID: ${sessionId}, Mentor ID: ${mentorId}`);

            // 1️⃣ Get session details before approving
            const [sessionRows] = await promisePool.query(
                `SELECT ss.id, ss.topic, ss.description, ss.session_date, ss.session_time, ss.duration,
                        ss.mentee_id, ss.mentor_id,
                        s.first_name as mentee_first_name, s.last_name as mentee_last_name,
                        us.email as mentee_email,
                        i.first_name as mentor_first_name, i.last_name as mentor_last_name,
                        ui.email as mentor_email
                 FROM scheduled_sessions ss
                 JOIN students s ON ss.mentee_id = s.user_id
                 JOIN users us ON s.user_id = us.uuid
                 JOIN instructors i ON ss.mentor_id = i.user_id
                 JOIN users ui ON i.user_id = ui.uuid
                 WHERE ss.id = ? AND ss.mentor_id = ? AND ss.status = 'pending'`,
                [sessionId, mentorId]
            );

            console.log(`📊 Session rows found: ${sessionRows ? sessionRows.length : 0}`);

            if (!sessionRows || sessionRows.length === 0) {
                throw new Error('Session request not found or already processed');
            }

            const sessionData = sessionRows[0];
            console.log(`📧 Mentee email: ${sessionData.mentee_email}, Mentor email: ${sessionData.mentor_email}`);
            console.log(`📅 Session date: ${sessionData.session_date}, time: ${sessionData.session_time}, duration: ${sessionData.duration}`);

            // 2️⃣ Create Google Meet + Calendar Event
            console.log(`🎥 Creating Google Meet link...`);

            // Format date properly from database
            let sessionDate;
            if (sessionData.session_date instanceof Date) {
                sessionDate = sessionData.session_date;
            } else {
                sessionDate = new Date(sessionData.session_date);
            }

            // Format time properly from database
            let sessionTime = sessionData.session_time;
            if (typeof sessionTime === 'object') {
                // If it's a time object from MySQL, convert to HH:MM:SS format
                const hours = String(sessionTime.hours || sessionTime.getHours()).padStart(2, '0');
                const minutes = String(sessionTime.minutes || sessionTime.getMinutes()).padStart(2, '0');
                const seconds = String(sessionTime.seconds || sessionTime.getSeconds() || 0).padStart(2, '0');
                sessionTime = `${hours}:${minutes}:${seconds}`;
            }

            // Construct datetime string
            const year = sessionDate.getFullYear();
            const month = String(sessionDate.getMonth() + 1).padStart(2, '0');
            const day = String(sessionDate.getDate()).padStart(2, '0');
            const dateTimeString = `${year}-${month}-${day}T${sessionTime}`;

            console.log(`🕐 Constructed datetime string: ${dateTimeString}`);

            const startTime = new Date(dateTimeString);
            if (isNaN(startTime.getTime())) {
                throw new Error(`Invalid datetime: ${dateTimeString}`);
            }

            const durationMinutes = parseInt(sessionData.duration) || 30;
            const endTime = new Date(startTime.getTime() + durationMinutes * 60000);

            console.log(`⏰ Start time: ${startTime.toISOString()}, End time: ${endTime.toISOString()}`);

            const meetLink = await googleMeetService.createMeetEvent({
                title: sessionData.topic,
                startTime: startTime.toISOString(),
                endTime: endTime.toISOString(),
                attendees: [
                    { email: sessionData.mentor_email },
                    { email: sessionData.mentee_email }
                ]
            });

            if (!meetLink) {
                throw new Error('Failed to generate Google Meet link');
            }
            console.log(`✅ Google Meet link created: ${meetLink}`);

            // 3️⃣ Approve the session and update with Meet link
            console.log(`💾 Updating session in database...`);
            const [updateResult] = await promisePool.query(
                `UPDATE scheduled_sessions
                 SET status = 'booked', url = ?
                 WHERE id = ? AND mentor_id = ? AND status = 'pending'`,
                [meetLink, sessionId, mentorId]
            );
            console.log(`✅ Database updated. Affected rows: ${updateResult.affectedRows}`);

            // 4️⃣ Prepare session data for email
            const approvedSession = {
                sessionId: sessionData.id,
                topic: sessionData.topic,
                description: sessionData.description,
                sessionDate: sessionData.session_date,
                sessionTime: sessionData.session_time,
                duration: sessionData.duration,
                meetLink: meetLink,
                mentorName: `${sessionData.mentor_first_name} ${sessionData.mentor_last_name}`,
                menteeName: `${sessionData.mentee_first_name} ${sessionData.mentee_last_name}`
            };

            // 5️⃣ Send confirmation emails
            console.log(`📧 Sending email to mentor: ${sessionData.mentor_email}`);
            try {
                await emailHelper.sendSessionScheduledEmail(
                    sessionData.mentor_email,
                    sessionData.mentor_first_name,
                    approvedSession,
                    `${sessionData.mentee_first_name} ${sessionData.mentee_last_name}`,
                    'mentee'
                );
                console.log(`✅ Email sent to mentor successfully`);
            } catch (emailError) {
                console.error(`❌ Failed to send email to mentor:`, emailError);
            }

            console.log(`📧 Sending email to mentee: ${sessionData.mentee_email}`);
            try {
                await emailHelper.sendSessionScheduledEmail(
                    sessionData.mentee_email,
                    sessionData.mentee_first_name,
                    approvedSession,
                    `${sessionData.mentor_first_name} ${sessionData.mentor_last_name}`,
                    'mentor'
                );
                console.log(`✅ Email sent to mentee successfully`);
            } catch (emailError) {
                console.error(`❌ Failed to send email to mentee:`, emailError);
            }

            console.log(`✅ Session approval completed successfully. Session ID: ${sessionId}, Meet Link: ${meetLink}`);
            return true;

        } catch (error) {
            console.error('❌ Error approving session request:', error);
            console.error('Error stack:', error.stack);
            throw error;
        }
    }

    async rejectSessionRequest(mentorId, sessionId) {
        try {
            // 1️⃣ Get session details before rejecting
            const [sessionRows] = await promisePool.query(
                `SELECT ss.id, ss.topic, ss.session_date, ss.session_time, ss.duration,
                        ss.mentee_id, ss.mentor_id,
                        s.first_name as mentee_first_name, s.last_name as mentee_last_name,
                        us.email as mentee_email,
                        i.first_name as mentor_first_name, i.last_name as mentor_last_name
                 FROM scheduled_sessions ss
                 JOIN students s ON ss.mentee_id = s.user_id
                 JOIN users us ON s.user_id = us.uuid
                 JOIN instructors i ON ss.mentor_id = i.user_id
                 WHERE ss.id = ? AND ss.mentor_id = ? AND ss.status = 'pending'`,
                [sessionId, mentorId]
            );

            if (!sessionRows || sessionRows.length === 0) {
                throw new Error('Session request not found or already processed');
            }

            const sessionData = sessionRows[0];

            // 2️⃣ Reject the session request
            await promisePool.query(
                'CALL instructor_reject_session_request(?, ?)',
                [mentorId, sessionId]
            );

            // 3️⃣ Send email notification to mentee
            await emailHelper.sendSessionRejectedEmail(
                sessionData.mentee_email,
                sessionData.mentee_first_name,
                {
                    topic: sessionData.topic,
                    sessionDate: sessionData.session_date,
                    sessionTime: sessionData.session_time,
                    duration: sessionData.duration
                },
                `${sessionData.mentor_first_name} ${sessionData.mentor_last_name}`
            );

            console.log(`✅ Session rejected and email sent to ${sessionData.mentee_email}`);
            return true;

        } catch (error) {
            console.error('Error rejecting session request:', error);
            throw error;
        }
    }

    async getUpcomingScheduleSessions(mentorId, limit = 10, offset = 0) {
        const [rows] = await promisePool.query(
            'CALL instructor_get_upcoming_schedule_sessions(?, ?, ?)',
            [mentorId, limit, offset]
        );
        return rows[0].map(row => new SessionRequestDTO(row));
    }

    async getPastScheduleSessions(mentorId, limit = 10, offset = 0) {
        const [rows] = await promisePool.query(
            'CALL instructor_get_past_schedule_sessions(?, ?, ?)',
            [mentorId, limit, offset]
        );
        return rows[0].map(row => new SessionRequestDTO(row));
    }

    async scheduleSession(mentorId, data) {
        try {
            // 1️⃣ Fetch mentor details
            const [mentorRows] = await promisePool.query(
                `SELECT u.email, i.first_name, i.last_name
                 FROM instructors i
                 JOIN users u ON i.user_id = u.uuid
                 WHERE i.user_id = ?`,
                [mentorId]
            );

            if (!mentorRows || mentorRows.length === 0) {
                throw new Error('Mentor not found');
            }

            const mentor = mentorRows[0];

            // 2️⃣ Fetch mentee details
            const [menteeRows] = await promisePool.query(
                `SELECT u.email, s.first_name, s.last_name
                 FROM students s
                 JOIN users u ON s.user_id = u.uuid
                 WHERE s.user_id = ?`,
                [data.menteeId]
            );

            if (!menteeRows || menteeRows.length === 0) {
                throw new Error('Mentee not found');
            }

            const mentee = menteeRows[0];

            // 3️⃣ Create Google Meet + Calendar Event
            const startTime = new Date(`${data.sessionDate}T${data.sessionTime}:00`);
            const durationMinutes = parseInt(data.duration) || 30;
            const endTime = new Date(startTime.getTime() + durationMinutes * 60000);

            const meetLink = await googleMeetService.createMeetEvent({
                title: data.topic,
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

            // 4️⃣ Save session in DB with auto-generated Meet link
            const [result] = await promisePool.query(
                'CALL instructor_schedule_session(?, ?, ?, ?, ?, ?, ?, ?)',
                [
                    mentorId,
                    data.menteeId,
                    data.sessionDate,
                    data.sessionTime,
                    data.topic,
                    data.description || '',
                    meetLink, // Use auto-generated Meet link
                    data.duration
                ]
            );

            const sessionId = result[0][0].session_id;

            // 5️⃣ Prepare session data for email
            const newSession = {
                sessionId: sessionId,
                topic: data.topic,
                description: data.description,
                sessionDate: data.sessionDate,
                sessionTime: data.sessionTime,
                duration: data.duration,
                meetLink: meetLink,
                mentorName: `${mentor.first_name} ${mentor.last_name}`,
                menteeName: `${mentee.first_name} ${mentee.last_name}`
            };

            // 6️⃣ Send confirmation emails
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

            console.log(`✅ Session scheduled successfully. ID: ${sessionId}, Meet Link: ${meetLink}`);
            return sessionId;

        } catch (error) {
            console.error('Error scheduling session:', error);
            throw error;
        }
    }

    async updateScheduledSession(mentorId, sessionId, data) {
        await promisePool.query(
            'CALL instructor_update_scheduled_session(?, ?, ?, ?, ?, ?, ?)',
            [
                mentorId,
                sessionId,
                data.sessionDate,
                data.sessionTime,
                data.topic,
                data.description,
                data.url
            ]
        );
        return true;
    }
}

module.exports = new InstructorMentorshipService();