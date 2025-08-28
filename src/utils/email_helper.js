const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs').promises;
const handlebars = require('handlebars');
const { v4: uuidv4 } = require('uuid');
const { promisePool } = require('../config/db');

class EmailHelper {
  constructor() {
    this.transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || 'Gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      },
      pool: true,
      rateLimit: true,
      maxConnections: 5,
      maxMessages: 100
    });

    this.templates = {};
    this.loadTemplates();
  }

  async loadTemplates() {
    const templateDir = path.join(__dirname, 'email_templates');
    try {
      const files = await fs.readdir(templateDir);
      
      for (const file of files) {
        if (file.endsWith('.hbs')) {
          const templateName = path.basename(file, '.hbs');
          const content = await fs.readFile(path.join(templateDir, file), 'utf8');
          this.templates[templateName] = handlebars.compile(content);
        }
      }
    } catch (err) {
      console.error('Could not load email templates:', err);
    }
  }

  // Generate 6-digit verification code
  generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async sendEmail(options) {
    const mailOptions = {
      from: `"${process.env.EMAIL_SENDER_NAME || 'LMS System'}" <${process.env.EMAIL_FROM || 'no-reply@lms.com'}>`,
      to: options.to,
      subject: options.subject,
      replyTo: process.env.EMAIL_REPLY_TO || process.env.EMAIL_FROM,
      headers: {
        'X-Library-Management-System': '1.0'
      },
      ...options
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('Email sent:', info.messageId);
      return info;
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }

  async sendVerificationEmail(email, verificationCode) {
    const templateData = {
      appName: process.env.APP_NAME || 'Learning Management System',
      verificationCode,
      supportEmail: process.env.SUPPORT_EMAIL || 'support@lms.com',
      year: new Date().getFullYear()
    };

    const html = this.templates['verification'](templateData);
    const text = `Please use the following verification code: ${verificationCode}\n\nThis code will expire in 1 hour.`;

    return this.sendEmail({
      to: email,
      subject: `Verify your email for ${templateData.appName}`,
      html,
      text,
      priority: 'high'
    });
  }

  async sendPasswordResetWithBothOptions(email) {
    const resetToken = uuidv4();
    const verificationCode = this.generateVerificationCode();
    const expiresAt = new Date(Date.now() + 3600000);
    
    await promisePool.query(
      'UPDATE users SET reset_token = ?, reset_token_expires = ?, verification_code = ? WHERE email = ?',
      [resetToken, expiresAt, verificationCode, email]
    );

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    
    const templateData = {
      appName: process.env.APP_NAME || 'Learning Management System',
      resetUrl,
      verificationCode,
      supportEmail: process.env.SUPPORT_EMAIL || 'support@lms.com',
      year: new Date().getFullYear()
    };

    const html = this.templates['password-reset'](templateData);
    const text = `You can reset your password by either:
1. Clicking this link: ${resetUrl}
2. Using this verification code: ${verificationCode}

Both options will expire in 1 hour.`;

    return this.sendEmail({
      to: email,
      subject: `Password reset request for ${templateData.appName}`,
      html,
      text,
      priority: 'high'
    });
  }

  async sendWelcomeEmail(email, firstName) {
    const templateData = {
      appName: process.env.APP_NAME || 'Learning Management System',
      firstName,
      loginUrl: `${process.env.FRONTEND_URL}/login`,
      supportEmail: process.env.SUPPORT_EMAIL || 'support@lms.com',
      year: new Date().getFullYear()
    };

    const html = this.templates['welcome'](templateData);
    const text = `Welcome to ${templateData.appName}, ${firstName}! You can now log in at ${templateData.loginUrl}`;

    return this.sendEmail({
      to: email,
      subject: `Welcome to ${templateData.appName}!`,
      html,
      text
    });
  }

  async sendEventRegistrationEmail(email, firstName, eventData) {
    // Format date and time for display
    const formatDate = (dateString) => {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    };

    const formatTime = (timeString) => {
      if (!timeString) return '';
      const [hours, minutes] = timeString.split(':');
      const date = new Date();
      date.setHours(parseInt(hours), parseInt(minutes));
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    };


    const templateData = {
      appName: process.env.APP_NAME || 'Learning Management System',
      firstName,
      eventTitle: eventData.title,
      eventDescription: eventData.description,
      eventDate: formatDate(eventData.start_date),
      eventStartTime: formatTime(eventData.start_time),
      eventEndTime: formatTime(eventData.end_time),
      eventVenue: eventData.event_venue,
      eventUrl: eventData.url,
      speakers: eventData.speakers,
      maxLimit: eventData.max_limit,
      attendeesCount: eventData.attendees_count || 0,
      isOnlineEvent: !!eventData.online_event,
      supportEmail: 'support@multiplierskraft.com',
      supportUrl: `${process.env.FRONTEND_URL}/support`,
      loginUrl: `${process.env.FRONTEND_URL}/login`,
      eventsUrl: `${process.env.FRONTEND_URL}/student-events`,
      year: new Date().getFullYear()
    };

    const html = this.templates['event-registration'](templateData);
    const text = `Thank you for registering for "${eventData.title}"!\n\nEvent Details:\n- Date: ${templateData.eventDate}\n- Time: ${templateData.eventStartTime}${templateData.eventEndTime ? ` - ${templateData.eventEndTime}` : ''}\n${eventData.event_venue ? `- Venue: ${eventData.event_venue}\n` : ''}${eventData.online_event ? '- This is an online event\n' : ''}${eventData.url ? `- Event URL: ${eventData.url}\n` : ''}\n\nWe look forward to seeing you there!`;

    return this.sendEmail({
      to: email,
      subject: `Event Registration Confirmed: ${eventData.title}`,
      html,
      text,
      priority: 'normal'
    });
  }

  async sendBulkEventRegistrationEmail(email, firstName, eventData) {
    // Format date and time for display
    const formatDate = (dateString) => {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    };

    const formatTime = (timeString) => {
      if (!timeString) return '';
      const [hours, minutes] = timeString.split(':');
      const date = new Date();
      date.setHours(parseInt(hours), parseInt(minutes));
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    };

    const templateData = {
      appName: process.env.APP_NAME || 'Learning Management System',
      firstName,
      eventTitle: eventData.title,
      eventDescription: eventData.description,
      eventDate: formatDate(eventData.startDate),
      eventStartTime: formatTime(eventData.startTime),
      eventEndTime: formatTime(eventData.endTime),
      eventVenue: eventData.eventVenue,
      eventUrl: eventData.url,
      speakers: eventData.speakers,
      maxLimit: eventData.maxLimit,
      attendeesCount: eventData.attendeesCount || 0,
      isOnlineEvent: !!eventData.onlineEvent,
      supportEmail: 'support@multiplierskraft.com',
      supportUrl: `${process.env.FRONTEND_URL}/support`,
      loginUrl: `${process.env.FRONTEND_URL}/login`,
      eventsUrl: `${process.env.FRONTEND_URL}/student-events`,
      year: new Date().getFullYear()
    };

    const html = this.templates['event-bulk-registration'](templateData);
    const text = `You have been registered for "${eventData.title}"!\n\nEvent Details:\n- Date: ${templateData.eventDate}\n- Time: ${templateData.eventStartTime}${templateData.eventEndTime ? ` - ${templateData.eventEndTime}` : ''}\n${eventData.eventVenue ? `- Venue: ${eventData.eventVenue}\n` : ''}${eventData.onlineEvent ? '- This is an online event\n' : ''}${eventData.url ? `- Event URL: ${eventData.url}\n` : ''}\n\nWe look forward to seeing you there!`;

    return this.sendEmail({
      to: email,
      subject: `Event Registration: ${eventData.title}`,
      html,
      text,
      priority: 'normal'
    });
  }
}

module.exports = new EmailHelper();