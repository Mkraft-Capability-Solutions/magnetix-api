const NotificationService = require('../services/notification_service');

/**
 * Notification Helper - Creates system event notifications
 * This helper is used by other services to trigger notifications for system events
 */
class NotificationHelper {
  /**
   * Notify user of course enrollment
   * @param {string} userId - User UUID
   * @param {string} courseName - Name of the course
   * @param {number} courseId - Course ID
   */
  static async notifyEnrollment(userId, courseName, courseId) {
    try {
      await NotificationService.createSystemNotification(
        userId,
        'Course Enrollment Confirmed',
        `You have been successfully enrolled in the course: ${courseName}`,
        'course',
        `/learner/courses/${courseId}`,
        { courseId, eventType: 'enrollment' }
      );
    } catch (error) {
      console.error('Failed to create enrollment notification:', error);
    }
  }

  /**
   * Notify instructor of session scheduled
   * @param {string} userId - User UUID
   * @param {string} sessionTitle - Title of the session
   * @param {number} sessionId - Session ID
   * @param {string} sessionDate - Session date
   */
  static async notifySessionScheduled(userId, sessionTitle, sessionId, sessionDate) {
    try {
      await NotificationService.createSystemNotification(
        userId,
        'Session Scheduled',
        `Your session "${sessionTitle}" has been scheduled for ${sessionDate}`,
        'instructor',
        `/instructor/sessions/${sessionId}`,
        { sessionId, eventType: 'session_scheduled', date: sessionDate }
      );
    } catch (error) {
      console.error('Failed to create session notification:', error);
    }
  }

  /**
   * Notify user of event registration
   * @param {string} userId - User UUID
   * @param {string} eventName - Name of the event
   * @param {number} eventId - Event ID
   */
  static async notifyEventRegistration(userId, eventName, eventId) {
    try {
      await NotificationService.createSystemNotification(
        userId,
        'Event Registration Confirmed',
        `You have been registered for the event: ${eventName}`,
        'event',
        `/events/${eventId}`,
        { eventId, eventType: 'event_registration' }
      );
    } catch (error) {
      console.error('Failed to create event registration notification:', error);
    }
  }

  /**
   * Notify user of certificate issuance
   * @param {string} userId - User UUID
   * @param {string} courseName - Name of the course
   * @param {number} certificateId - Certificate ID
   */
  static async notifyCertificateIssued(userId, courseName, certificateId) {
    try {
      await NotificationService.createSystemNotification(
        userId,
        'Certificate Issued',
        `Congratulations! Your certificate for ${courseName} has been issued and is ready for download.`,
        'course',
        `/learner/certificates/${certificateId}`,
        { certificateId, courseName, eventType: 'certificate_issued' }
      );
    } catch (error) {
      console.error('Failed to create certificate notification:', error);
    }
  }

  /**
   * Notify mentor of mentorship request
   * @param {string} mentorId - Mentor UUID
   * @param {string} studentName - Name of the student
   * @param {string} studentId - Student UUID
   */
  static async notifyMentorshipRequest(mentorId, studentName, studentId) {
    try {
      await NotificationService.createSystemNotification(
        mentorId,
        'New Mentorship Request',
        `${studentName} has requested your mentorship`,
        'instructor',
        `/instructor/mentorship`,
        { studentId, studentName, eventType: 'mentorship_request' }
      );
    } catch (error) {
      console.error('Failed to create mentorship request notification:', error);
    }
  }

  /**
   * Notify user of course progress milestone
   * @param {string} userId - User UUID
   * @param {string} courseName - Name of the course
   * @param {number} progress - Progress percentage (0-100)
   * @param {number} courseId - Course ID
   */
  static async notifyCourseProgress(userId, courseName, progress, courseId) {
    try {
      let message = '';
      if (progress === 25) {
        message = `You're 25% through ${courseName}. Keep up the great work!`;
      } else if (progress === 50) {
        message = `You're halfway through ${courseName}. You're doing great!`;
      } else if (progress === 75) {
        message = `You're 75% through ${courseName}. Almost there!`;
      } else if (progress === 100) {
        message = `Congratulations! You've completed ${courseName}!`;
      } else {
        message = `Your progress in ${courseName} is now ${progress}%.`;
      }

      await NotificationService.createSystemNotification(
        userId,
        'Course Progress Update',
        message,
        'course',
        `/learner/courses/${courseId}`,
        { courseId, progress, eventType: 'progress_milestone' }
      );
    } catch (error) {
      console.error('Failed to create progress notification:', error);
    }
  }

  /**
   * Notify user of announcement
   * @param {string} userId - User UUID
   * @param {string} announcementTitle - Title of announcement
   * @param {string} announcementText - Announcement text
   * @param {number} announcementId - Announcement ID
   */
  static async notifyAnnouncement(userId, announcementTitle, announcementText, announcementId) {
    try {
      await NotificationService.createSystemNotification(
        userId,
        announcementTitle,
        announcementText,
        'announcement',
        `/announcements/${announcementId}`,
        { announcementId, eventType: 'announcement' }
      );
    } catch (error) {
      console.error('Failed to create announcement notification:', error);
    }
  }

  /**
   * Notify instructor of course review
   * @param {string} instructorId - Instructor UUID
   * @param {string} studentName - Name of student who reviewed
   * @param {number} rating - Rating (1-5)
   * @param {number} courseId - Course ID
   */
  static async notifyCourseReview(instructorId, studentName, rating, courseId) {
    try {
      const message = `${studentName} gave your course a ${rating}-star review`;
      await NotificationService.createSystemNotification(
        instructorId,
        'New Course Review',
        message,
        'course',
        `/instructor/courses/${courseId}/reviews`,
        { studentName, rating, courseId, eventType: 'course_review' }
      );
    } catch (error) {
      console.error('Failed to create review notification:', error);
    }
  }

  /**
   * Bulk notify multiple users
   * @param {string[]} userIds - Array of user UUIDs
   * @param {string} title - Notification title
   * @param {string} message - Notification message
   * @param {string} type - Notification type
   * @param {string} actionUrl - Action URL
   * @param {object} metadata - Additional metadata
   */
  static async notifyMultiple(userIds, title, message, type, actionUrl = null, metadata = null) {
    try {
      const notifications = userIds.map(userId => ({
        title,
        message,
        notification_type: type,
        icon: this.getIconForType(type),
        recipient_id: userId,
        delivery_method: 'in-app',
        metadata: metadata ? JSON.stringify(metadata) : null,
        action_url: actionUrl
      }));

      await NotificationService.createBulkNotifications(notifications);
    } catch (error) {
      console.error('Failed to create bulk notifications:', error);
    }
  }

  /**
   * Get icon for notification type
   * @private
   */
  static getIconForType(type) {
    const iconMap = {
      'marketing': 'megaphone',
      'system': 'settings',
      'announcement': 'bell',
      'instructor': 'users',
      'event': 'calendar',
      'course': 'book'
    };
    return iconMap[type] || 'bell';
  }
}

module.exports = NotificationHelper;
