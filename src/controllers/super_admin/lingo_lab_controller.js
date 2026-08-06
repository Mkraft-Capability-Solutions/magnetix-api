const lingo = require('../../services/student/lingo_lab_service');

/**
 * Super Admin — Lingo Lab settings (global level-unlock policy).
 */

exports.getSettings = async (req, res, next) => {
  try {
    const result = await lingo.getSettings();
    return res.json({ success: true, data: result.data });
  } catch (error) {
    console.error('SuperAdmin LingoLab getSettings:', error);
    next(error);
  }
};

exports.updateSettings = async (req, res, next) => {
  try {
    const mode = (req.body || {}).unlockMode;
    if (mode !== 'progressive' && mode !== 'all') {
      return res.status(400).json({ success: false, message: "unlockMode must be 'progressive' or 'all'" });
    }
    const result = await lingo.setSettings(mode, req.user.uuid);
    return res.json({ success: true, message: 'Settings saved', data: result.data });
  } catch (error) {
    console.error('SuperAdmin LingoLab updateSettings:', error);
    next(error);
  }
};
