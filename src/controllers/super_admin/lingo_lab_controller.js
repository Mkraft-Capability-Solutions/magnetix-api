const lingo = require('../../services/student/lingo_lab_service');
const seed = require('../../services/student/lingo_seed_service');

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

// ---- Content seeding (Vocabulary / Pronunciation / Listening source data) ----
exports.generateVocabulary = async (req, res, next) => {
  try {
    const result = await seed.generate(req.body || {});
    if (!result.success) return res.status(result.status || 400).json({ success: false, message: result.message });
    return res.json({ success: true, data: result.data });
  } catch (error) { console.error('SuperAdmin LingoLab generateVocabulary:', error); next(error); }
};

exports.addVocabulary = async (req, res, next) => {
  try {
    const result = await seed.addWord(req.body || {});
    if (!result.success) return res.status(result.status || 400).json({ success: false, message: result.message });
    return res.json({ success: true, data: result.data });
  } catch (error) { console.error('SuperAdmin LingoLab addVocabulary:', error); next(error); }
};

exports.vocabularySummary = async (req, res, next) => {
  try {
    const result = await seed.summary();
    return res.json({ success: true, data: result.data });
  } catch (error) { console.error('SuperAdmin LingoLab vocabularySummary:', error); next(error); }
};

exports.deleteVocabulary = async (req, res, next) => {
  try {
    const result = await seed.deleteCategory({
      language: req.query.language || (req.body || {}).language,
      category: req.query.category || (req.body || {}).category,
    });
    if (!result.success) return res.status(result.status || 400).json({ success: false, message: result.message });
    return res.json({ success: true, data: result.data });
  } catch (error) { console.error('SuperAdmin LingoLab deleteVocabulary:', error); next(error); }
};
