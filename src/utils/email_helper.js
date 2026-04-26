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

  async sendInvitationEmail(email, firstName, { password, roleLabel }) {
    const templateData = {
      appName: process.env.APP_NAME || 'Learning Management System',
      firstName: firstName || 'there',
      email,
      password,
      roleLabel: roleLabel || 'User',
      loginUrl: `${process.env.FRONTEND_URL}/login`,
      supportEmail: process.env.SUPPORT_EMAIL || 'support@multiplierskraft.com',
      year: new Date().getFullYear()
    };

    const html = this.templates['invitation']
      ? this.templates['invitation'](templateData)
      : `<p>Welcome to ${templateData.appName}, ${templateData.firstName}!</p>
         <p>You've been added as a ${templateData.roleLabel}.</p>
         <p>Email: ${email}<br/>Temporary password: ${password}</p>
         <p>Log in at: ${templateData.loginUrl}</p>`;

    const text = `Welcome to ${templateData.appName}, ${templateData.firstName}!

You've been added as a ${templateData.roleLabel}. Use the credentials below to sign in.

Email: ${email}
Temporary password: ${password}

How to log in:
1. Open ${templateData.loginUrl} in your browser.
2. Enter the email and temporary password above.
3. Click Log In.
4. Go to your profile settings and change your password.

For security, please change your password immediately after your first login and never share it with anyone.

Need help? Contact ${templateData.supportEmail}.`;

    return this.sendEmail({
      to: email,
      subject: `You've been invited to ${templateData.appName}`,
      html,
      text,
      priority: 'high'
    });
  }

  // ==============================================================
  // Assignment feature emails
  // ==============================================================

  _formatAssignmentDate(value) {
    if (!value) return '';
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString('en-US', {
      weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true
    });
  }

  _assignmentLearnerUrl(assignmentUuid) {
    return `${process.env.FRONTEND_URL}/learner/assignments/${assignmentUuid}`;
  }

  _assignmentSubmissionsUrl(assignmentUuid, role = 'admin') {
    return `${process.env.FRONTEND_URL}/${role}/assignments/${assignmentUuid}/submissions`;
  }

  async sendAssignmentCreatedEmail(email, firstName, assignment) {
    const typeLabel = assignment.type === 'assessment' ? 'Take an assessment' : 'Submit a document';
    const scopeLabel = assignment.scope === 'organization' ? 'Organization-wide' : 'Team';
    const templateData = {
      appName: process.env.APP_NAME || 'Learning Management System',
      firstName: firstName || 'there',
      assignmentTitle: assignment.title,
      description: assignment.description || '',
      typeLabel,
      scopeLabel,
      startDate: this._formatAssignmentDate(assignment.start_date),
      endDate: this._formatAssignmentDate(assignment.end_date),
      assignmentUrl: this._assignmentLearnerUrl(assignment.uuid),
      supportEmail: process.env.SUPPORT_EMAIL || 'support@multiplierskraft.com',
      year: new Date().getFullYear()
    };

    const html = this.templates['assignment-created']
      ? this.templates['assignment-created'](templateData)
      : `<p>Hi ${templateData.firstName},</p><p>A new assignment "${templateData.assignmentTitle}" is available. Due by ${templateData.endDate}.</p><p><a href="${templateData.assignmentUrl}">Open assignment</a></p>`;

    const text = `Hi ${templateData.firstName},

A new assignment has been created for you on ${templateData.appName}.

Title: ${templateData.assignmentTitle}
Type: ${typeLabel}
Available from: ${templateData.startDate}
Due by: ${templateData.endDate}

Open it: ${templateData.assignmentUrl}

Late submissions will not be accepted. Need help? Contact ${templateData.supportEmail}.`;

    return this.sendEmail({
      to: email,
      subject: `New assignment: ${assignment.title}`,
      html,
      text
    });
  }

  async sendAssignmentReminderEmail(email, firstName, assignment, hoursRemaining) {
    const typeLabel = assignment.type === 'assessment' ? 'Take an assessment' : 'Submit a document';
    const templateData = {
      appName: process.env.APP_NAME || 'Learning Management System',
      firstName: firstName || 'there',
      assignmentTitle: assignment.title,
      typeLabel,
      hoursRemaining: hoursRemaining || 24,
      endDate: this._formatAssignmentDate(assignment.end_date),
      assignmentUrl: this._assignmentLearnerUrl(assignment.uuid),
      supportEmail: process.env.SUPPORT_EMAIL || 'support@multiplierskraft.com',
      year: new Date().getFullYear()
    };

    const html = this.templates['assignment-reminder']
      ? this.templates['assignment-reminder'](templateData)
      : `<p>Hi ${templateData.firstName},</p><p>Reminder: "${templateData.assignmentTitle}" is due in ~${templateData.hoursRemaining} hours (${templateData.endDate}).</p>`;

    const text = `Hi ${templateData.firstName},

Reminder: your assignment "${templateData.assignmentTitle}" is due in approximately ${templateData.hoursRemaining} hours.
Due by: ${templateData.endDate}

Open it: ${templateData.assignmentUrl}

Late submissions will not be accepted.`;

    return this.sendEmail({
      to: email,
      subject: `Reminder: ${assignment.title} due in ${hoursRemaining}h`,
      html,
      text,
      priority: 'high'
    });
  }

  async sendSubmissionConfirmationEmail(email, firstName, assignment, submission) {
    const templateData = {
      appName: process.env.APP_NAME || 'Learning Management System',
      firstName: firstName || 'there',
      assignmentTitle: assignment.title,
      submittedAt: this._formatAssignmentDate(submission.submitted_at || new Date()),
      fileName: submission.file_name || '',
      assessmentScore: submission.assessment_score || '',
      allowResubmission: !!assignment.allow_resubmission,
      endDate: this._formatAssignmentDate(assignment.end_date),
      assignmentUrl: this._assignmentLearnerUrl(assignment.uuid),
      supportEmail: process.env.SUPPORT_EMAIL || 'support@multiplierskraft.com',
      year: new Date().getFullYear()
    };

    const html = this.templates['assignment-submission-confirm']
      ? this.templates['assignment-submission-confirm'](templateData)
      : `<p>Hi ${templateData.firstName},</p><p>We received your submission for "${templateData.assignmentTitle}" at ${templateData.submittedAt}.</p>`;

    const text = `Hi ${templateData.firstName},

We received your submission for "${templateData.assignmentTitle}" at ${templateData.submittedAt}.
${templateData.fileName ? `File: ${templateData.fileName}\n` : ''}${templateData.assessmentScore ? `Score: ${templateData.assessmentScore}\n` : ''}
${templateData.allowResubmission ? `You can update your submission until ${templateData.endDate}.` : 'Your submission is final and cannot be changed.'}

View it: ${templateData.assignmentUrl}`;

    return this.sendEmail({
      to: email,
      subject: `Submission received: ${assignment.title}`,
      html,
      text
    });
  }

  async sendSubmissionReceivedEmail(creatorEmail, creatorName, learnerName, learnerEmail, assignment, submission) {
    const role = (submission && submission.recipientRole) || 'admin';
    const templateData = {
      appName: process.env.APP_NAME || 'Learning Management System',
      recipientName: creatorName || 'there',
      learnerName,
      learnerEmail,
      assignmentTitle: assignment.title,
      submittedAt: this._formatAssignmentDate((submission && submission.submitted_at) || new Date()),
      fileName: (submission && submission.file_name) || '',
      assessmentScore: (submission && submission.assessment_score) || '',
      submissionUrl: this._assignmentSubmissionsUrl(assignment.uuid, role),
      supportEmail: process.env.SUPPORT_EMAIL || 'support@multiplierskraft.com',
      year: new Date().getFullYear()
    };

    const html = this.templates['assignment-submission-received']
      ? this.templates['assignment-submission-received'](templateData)
      : `<p>Hi ${templateData.recipientName},</p><p>${learnerName} submitted "${assignment.title}".</p>`;

    const text = `Hi ${templateData.recipientName},

${learnerName} (${learnerEmail}) has submitted assignment "${assignment.title}" at ${templateData.submittedAt}.
${templateData.fileName ? `File: ${templateData.fileName}\n` : ''}${templateData.assessmentScore ? `Score: ${templateData.assessmentScore}\n` : ''}
Review it: ${templateData.submissionUrl}`;

    return this.sendEmail({
      to: creatorEmail,
      subject: `New submission: ${assignment.title}`,
      html,
      text
    });
  }

  async sendMissedDeadlineLearnerEmail(email, firstName, assignment) {
    const templateData = {
      appName: process.env.APP_NAME || 'Learning Management System',
      firstName: firstName || 'there',
      assignmentTitle: assignment.title,
      endDate: this._formatAssignmentDate(assignment.end_date),
      supportEmail: process.env.SUPPORT_EMAIL || 'support@multiplierskraft.com',
      year: new Date().getFullYear()
    };

    const html = this.templates['assignment-missed-learner']
      ? this.templates['assignment-missed-learner'](templateData)
      : `<p>Hi ${templateData.firstName},</p><p>You missed the deadline for "${templateData.assignmentTitle}" (${templateData.endDate}).</p>`;

    const text = `Hi ${templateData.firstName},

The deadline for "${templateData.assignmentTitle}" has passed (${templateData.endDate}) and we did not receive a submission from you.

Your manager and admin have been notified. Contact ${templateData.supportEmail} if you believe this is in error.`;

    return this.sendEmail({
      to: email,
      subject: `Missed deadline: ${assignment.title}`,
      html,
      text
    });
  }

  async sendMissedDeadlineEscalationEmail(recipientEmail, recipientName, assignment, missedUsers, recipientRole = 'admin') {
    const templateData = {
      appName: process.env.APP_NAME || 'Learning Management System',
      recipientName: recipientName || 'there',
      assignmentTitle: assignment.title,
      endDate: this._formatAssignmentDate(assignment.end_date),
      missedCount: missedUsers.length,
      missedUsers,
      assignmentUrl: this._assignmentSubmissionsUrl(assignment.uuid, recipientRole),
      supportEmail: process.env.SUPPORT_EMAIL || 'support@multiplierskraft.com',
      year: new Date().getFullYear()
    };

    const html = this.templates['assignment-missed-escalation']
      ? this.templates['assignment-missed-escalation'](templateData)
      : `<p>Hi ${templateData.recipientName},</p><p>${missedUsers.length} learner(s) missed the deadline for "${assignment.title}".</p>`;

    const text = `Hi ${templateData.recipientName},

${missedUsers.length} learner(s) did not submit "${assignment.title}" by the deadline (${templateData.endDate}).

Missed:
${missedUsers.map(u => `  - ${u.name} <${u.email}>`).join('\n')}

Review in dashboard: ${templateData.assignmentUrl}`;

    return this.sendEmail({
      to: recipientEmail,
      subject: `Missed submissions: ${assignment.title}`,
      html,
      text,
      priority: 'high'
    });
  }

  async sendReviewCompletedEmail(email, firstName, assignment, status, feedback, reviewerName) {
    const statusLabel = {
      reviewed: 'Reviewed',
      rejected: 'Rejected',
      submitted: 'Acknowledged'
    }[status] || status;

    const templateData = {
      appName: process.env.APP_NAME || 'Learning Management System',
      firstName: firstName || 'there',
      assignmentTitle: assignment.title,
      statusLabel,
      reviewerName: reviewerName || '',
      reviewedAt: this._formatAssignmentDate(new Date()),
      feedback: feedback || '',
      assignmentUrl: this._assignmentLearnerUrl(assignment.uuid),
      supportEmail: process.env.SUPPORT_EMAIL || 'support@multiplierskraft.com',
      year: new Date().getFullYear()
    };

    const html = this.templates['assignment-review-completed']
      ? this.templates['assignment-review-completed'](templateData)
      : `<p>Hi ${templateData.firstName},</p><p>Your submission for "${templateData.assignmentTitle}" has been reviewed: ${statusLabel}.</p>${feedback ? `<p>Feedback: ${feedback}</p>` : ''}`;

    const text = `Hi ${templateData.firstName},

Your submission for "${templateData.assignmentTitle}" has been reviewed.
Status: ${statusLabel}
${reviewerName ? `Reviewed by: ${reviewerName}\n` : ''}Reviewed at: ${templateData.reviewedAt}
${feedback ? `\nFeedback:\n${feedback}\n` : ''}
View it: ${templateData.assignmentUrl}`;

    return this.sendEmail({
      to: email,
      subject: `Submission reviewed: ${assignment.title}`,
      html,
      text
    });
  }

  /**
   * Email a learner the per-question result of an assessment submission.
   * payload: { assignmentTitle, assignmentUuid, score, maxScore, percentage,
   *            questionsAndAnswers[], showCorrect, appUrl }
   */
  async sendAssessmentResultEmail(email, firstName, payload) {
    const safeQA = Array.isArray(payload.questionsAndAnswers) ? payload.questionsAndAnswers : [];
    const templateData = {
      appName: process.env.APP_NAME || 'Learning Management System',
      firstName: firstName || 'there',
      assignmentTitle: payload.assignmentTitle || 'Assessment',
      score: payload.score != null ? payload.score : '-',
      maxScore: payload.maxScore != null ? payload.maxScore : '-',
      percentage: payload.percentage != null ? `${payload.percentage}%` : '-',
      questions: safeQA.map((q, idx) => {
        const userAnswerDisplay = q.answerText
          || (Array.isArray(q.answerOptions) ? q.answerOptions.join(', ') : '')
          || (q.answerRating != null ? `Rating: ${q.answerRating}` : '(no answer)');
        const correctAnswerDisplay = (payload.showCorrect && Array.isArray(q.correct_answers) && Array.isArray(q.options))
          ? q.correct_answers.map(idx => q.options[idx]).filter(Boolean).join(', ')
          : '';
        return {
          number: idx + 1,
          questionText: q.questionText,
          userAnswer: userAnswerDisplay,
          correctAnswer: correctAnswerDisplay,
          aiScore: q.aiScore != null ? `${q.aiScore} / ${q.questionMaxScore || q.aiMaxScore || ''}` : '',
          aiFeedback: q.aiFeedback || ''
        };
      }),
      assignmentUrl: payload.assignmentUuid
        ? `${payload.appUrl || process.env.FRONTEND_URL || ''}/learner/assignments/${payload.assignmentUuid}`
        : '',
      supportEmail: process.env.SUPPORT_EMAIL || 'support@multiplierskraft.com',
      year: new Date().getFullYear()
    };

    const html = this.templates['assignment-assessment-result']
      ? this.templates['assignment-assessment-result'](templateData)
      : `<p>Hi ${templateData.firstName},</p><p>Your result for "${templateData.assignmentTitle}": ${templateData.score} / ${templateData.maxScore} (${templateData.percentage})</p>`;

    const textLines = [
      `Hi ${templateData.firstName},`,
      ``,
      `Your assessment result for "${templateData.assignmentTitle}":`,
      `Score: ${templateData.score} / ${templateData.maxScore} (${templateData.percentage})`,
      ``,
      ...templateData.questions.flatMap((q) => [
        `Q${q.number}. ${q.questionText}`,
        `   Your answer: ${q.userAnswer}`,
        ...(q.correctAnswer ? [`   Correct: ${q.correctAnswer}`] : []),
        ...(q.aiScore ? [`   AI score: ${q.aiScore}`] : []),
        ...(q.aiFeedback ? [`   Feedback: ${q.aiFeedback}`] : []),
        ``
      ]),
      templateData.assignmentUrl ? `View online: ${templateData.assignmentUrl}` : ''
    ];

    return this.sendEmail({
      to: email,
      subject: `Assessment result: ${templateData.assignmentTitle}`,
      html,
      text: textLines.filter(Boolean).join('\n')
    });
  }

  async sendManagerAssignedEmail(managerEmail, managerName, team) {
    const templateData = {
      appName: process.env.APP_NAME || 'Learning Management System',
      managerName: managerName || 'there',
      teamName: team.name,
      memberCount: team.memberCount,
      organizationName: team.organizationName || '',
      managerUrl: `${process.env.FRONTEND_URL}/manager`,
      supportEmail: process.env.SUPPORT_EMAIL || 'support@multiplierskraft.com',
      year: new Date().getFullYear()
    };

    const html = this.templates['team-manager-assigned']
      ? this.templates['team-manager-assigned'](templateData)
      : `<p>Hi ${templateData.managerName},</p><p>You are now the manager of ${team.name}. <a href="${templateData.managerUrl}">Open dashboard</a>.</p>`;

    const text = `Hi ${templateData.managerName},

You have been assigned as the manager of "${team.name}" on ${templateData.appName}.
${templateData.organizationName ? `Organization: ${templateData.organizationName}\n` : ''}${templateData.memberCount ? `Members: ${templateData.memberCount}\n` : ''}
You can now view your team's data, create assignments for them, and review submissions.

Open the manager dashboard: ${templateData.managerUrl}`;

    return this.sendEmail({
      to: managerEmail,
      subject: `You're now managing ${team.name}`,
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

  async sendEventReminderEmail(email, firstName, eventData) {
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

    const html = this.templates['event-reminder'](templateData);
    const text = `REMINDER: "${eventData.title}" is starting soon!\n\nEvent Details:\n- Date: ${templateData.eventDate}\n- Time: ${templateData.eventStartTime}${templateData.eventEndTime ? ` - ${templateData.eventEndTime}` : ''}\n${eventData.event_venue ? `- Venue: ${eventData.event_venue}\n` : ''}${eventData.online_event ? '- This is an online event\n' : ''}${eventData.url ? `- Event URL: ${eventData.url}\n` : ''}\n\nDon't forget to join us! We're looking forward to seeing you there.`;

    return this.sendEmail({
      to: email,
      subject: `🔔 Reminder: ${eventData.title} - Starting Soon!`,
      html,
      text,
      priority: 'normal'
    });
  }

  async sendSessionScheduledEmail(email, firstName, sessionData, participantName, participantRole) {
      const formattedDate = new Date(sessionData.sessionDate).toLocaleDateString('en-IN', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      });

      const templateData = {
        firstName,
        topic: sessionData.topic,
        sessionDate: formattedDate,
        sessionTime: sessionData.sessionTime,
        duration: sessionData.duration,
        meetLink: sessionData.meetLink,
        participantName: participantName, // The other person in the session
        participantRole: participantRole, // 'mentor' or 'mentee'
        appName: process.env.APP_NAME || 'Learning Management System',
        year: new Date().getFullYear()
      };

      const html = this.templates['session-scheduled'](templateData);
      const text = `Your 1:1 session "${sessionData.topic}" has been scheduled with ${participantRole} ${participantName}.\n
    Date: ${formattedDate} at ${sessionData.sessionTime}\nDuration: ${sessionData.duration}\nJoin: ${sessionData.meetLink}`;

      return this.sendEmail({
        to: email,
        subject: `1:1 Session Scheduled: ${sessionData.topic}`,
        html,
        text
      });
    }

  async sendMentorshipApprovedEmail(email, firstName, mentorData) {
    const templateData = {
      firstName,
      mentorName: mentorData.mentorName,
      mentorEmail: mentorData.mentorEmail,
      mentorExpertise: mentorData.mentorExpertise || '',
      loginUrl: `${process.env.FRONTEND_URL}/student/mentorship`,
      supportEmail: process.env.SUPPORT_EMAIL || 'support@multiplierskraft.com',
      appName: process.env.APP_NAME || 'Learning Management System',
      year: new Date().getFullYear()
    };

    const html = this.templates['mentorship-approved'](templateData);
    const text = `Great news! Your mentorship request has been approved by ${mentorData.mentorName}.\n\nYou can now connect with your mentor and schedule 1:1 sessions. Login to your dashboard to get started.`;

    return this.sendEmail({
      to: email,
      subject: `Mentorship Request Approved - Welcome to your mentorship journey!`,
      html,
      text,
      priority: 'high'
    });
  }

  async sendScheduledReportEmail(recipients, reportTitle, pdfBuffer, fileName) {
    const templateData = {
      appName: process.env.APP_NAME || 'Learning Management System',
      reportTitle,
      generatedAt: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
      year: new Date().getFullYear()
    };

    const html = this.templates['scheduled-report']
      ? this.templates['scheduled-report'](templateData)
      : `<p>Your scheduled report "${reportTitle}" is attached.</p>`;

    const text = `Your scheduled "${reportTitle}" report has been generated and is attached to this email.\nGenerated: ${templateData.generatedAt}`;

    const recipientList = Array.isArray(recipients) ? recipients.join(', ') : recipients;

    return this.sendEmail({
      to: recipientList,
      subject: `Scheduled Report: ${reportTitle} - ${new Date().toLocaleDateString('en-IN')}`,
      html,
      text,
      attachments: [
        {
          filename: fileName || 'analytics-report.pdf',
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    });
  }

  async sendSessionRejectedEmail(email, firstName, sessionData, mentorName) {
    const formattedDate = new Date(sessionData.sessionDate).toLocaleDateString('en-IN', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    const templateData = {
      firstName,
      topic: sessionData.topic,
      sessionDate: formattedDate,
      sessionTime: sessionData.sessionTime,
      duration: sessionData.duration,
      mentorName: mentorName,
      loginUrl: `${process.env.FRONTEND_URL}/student/mentorship`,
      supportEmail: process.env.SUPPORT_EMAIL || 'support@multiplierskraft.com',
      appName: process.env.APP_NAME || 'Learning Management System',
      year: new Date().getFullYear()
    };

    const html = this.templates['session-rejected'](templateData);
    const text = `Your session request "${sessionData.topic}" has been declined by ${mentorName}.\n
    Requested Date: ${formattedDate} at ${sessionData.sessionTime}\n\nYou can schedule another session at a different time. Login to your dashboard to try again.`;

    return this.sendEmail({
      to: email,
      subject: `Session Request Update: ${sessionData.topic}`,
      html,
      text
    });
  }

}

module.exports = new EmailHelper();