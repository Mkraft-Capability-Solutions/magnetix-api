const emailHelper = require('./email_helper');

const ROLE_LABELS = {
  student: 'Learner',
  admin: 'Administrator',
  instructor: 'Instructor',
  super_admin: 'Super Administrator'
};

const sendInvitationSafely = async ({ email, firstName, password, roleLabel }) => {
  try {
    await emailHelper.sendInvitationEmail(email, firstName, { password, roleLabel });
    return { sent: true };
  } catch (error) {
    console.error(`Invitation email failed for ${email}:`, error);
    return { sent: false, error };
  }
};

module.exports = {
  ROLE_LABELS,
  sendInvitationSafely
};
