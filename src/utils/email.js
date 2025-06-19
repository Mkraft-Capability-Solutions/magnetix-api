const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  auth: {
    user: process.env.EMAIL_USERNAME,
    pass: process.env.EMAIL_PASSWORD
  }
});

const sendEmail = async (options) => {
  const mailOptions = {
    from: 'LMS System <no-reply@lms.com>',
    to: options.email,
    subject: options.subject,
    text: options.message
    // html: options.html (for HTML emails)
  };

  await transporter.sendMail(mailOptions);
};

module.exports = { sendEmail };