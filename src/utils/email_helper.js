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
}

module.exports = new EmailHelper();