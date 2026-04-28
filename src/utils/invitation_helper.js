const emailHelper = require('./email_helper');

const ROLE_LABELS = {
  learner: 'Learner',
  student: 'Learner',
  admin: 'Administrator',
  instructor: 'Instructor',
  super_admin: 'Super Administrator'
};

const sendInvitationSafely = async ({ email, firstName, password, roleLabel, organizationNames = [] }) => {
  try {
    await emailHelper.sendInvitationEmail(email, firstName, {
      password,
      roleLabel,
      organizationNames: Array.isArray(organizationNames) ? organizationNames : []
    });
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
