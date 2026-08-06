const service = require('../../services/student/lingo_lab_service');
const conversationService = require('../../services/student/lingo_conversation_service');

/**
 * Lingo Lab AI controller (learner). Thin HTTP layer over lingo_lab_service.
 * Actor is always the authenticated learner (req.user.uuid).
 */

exports.getProfile = async (req, res, next) => {
  try {
    const result = await service.getProfile(req.user.uuid);
    return res.json({ success: true, data: result.data });
  } catch (error) {
    console.error('LingoLab getProfile:', error);
    next(error);
  }
};

exports.saveProfile = async (req, res, next) => {
  try {
    const result = await service.upsertProfile(req.user.uuid, req.body || {});
    if (!result.success) return res.status(result.status || 400).json({ success: false, message: result.message });
    return res.json({ success: true, message: result.message, data: result.data });
  } catch (error) {
    console.error('LingoLab saveProfile:', error);
    next(error);
  }
};

exports.getLanguages = async (req, res, next) => {
  try {
    const result = await service.getLanguages(req.user.uuid);
    return res.json({ success: true, data: result.data });
  } catch (error) {
    console.error('LingoLab getLanguages:', error);
    next(error);
  }
};

exports.switchLanguage = async (req, res, next) => {
  try {
    const result = await service.switchLanguage(req.user.uuid, (req.body || {}).targetLanguage);
    if (!result.success) return res.status(result.status || 400).json({ success: false, message: result.message });
    return res.json({ success: true, message: result.message, data: result.data });
  } catch (error) {
    console.error('LingoLab switchLanguage:', error);
    next(error);
  }
};

exports.getDashboard = async (req, res, next) => {
  try {
    const result = await service.getDashboard(req.user.uuid);
    return res.json({ success: true, data: result.data });
  } catch (error) {
    console.error('LingoLab getDashboard:', error);
    next(error);
  }
};

exports.getCategories = async (req, res, next) => {
  try {
    const lang = req.query.lang;
    if (!lang) return res.status(400).json({ success: false, message: 'lang query param is required' });
    const result = await service.getCategories(req.user.uuid, lang);
    return res.json({ success: true, data: result.data });
  } catch (error) {
    console.error('LingoLab getCategories:', error);
    next(error);
  }
};

exports.getVocabulary = async (req, res, next) => {
  try {
    const lang = req.query.lang;
    if (!lang) return res.status(400).json({ success: false, message: 'lang query param is required' });
    const result = await service.getVocabulary(req.user.uuid, lang, req.query.category || null);
    return res.json({ success: true, data: result.data });
  } catch (error) {
    console.error('LingoLab getVocabulary:', error);
    next(error);
  }
};

exports.getReview = async (req, res, next) => {
  try {
    const lang = req.query.lang;
    if (!lang) return res.status(400).json({ success: false, message: 'lang query param is required' });
    const result = await service.getReviewQueue(req.user.uuid, lang);
    return res.json({ success: true, data: result.data });
  } catch (error) {
    console.error('LingoLab getReview:', error);
    next(error);
  }
};

exports.submitActivity = async (req, res, next) => {
  try {
    const result = await service.submitActivity(req.user.uuid, req.body || {});
    if (!result.success) return res.status(result.status || 400).json({ success: false, message: result.message });
    return res.json({ success: true, data: result.data });
  } catch (error) {
    console.error('LingoLab submitActivity:', error);
    next(error);
  }
};

// ---- Text Conversation Lab (Level 6) ----
exports.getScenarios = async (req, res, next) => {
  try {
    return res.json({ success: true, data: conversationService.listScenarios() });
  } catch (error) {
    console.error('LingoLab getScenarios:', error);
    next(error);
  }
};

exports.listConversations = async (req, res, next) => {
  try {
    const result = await conversationService.listConversations(req.user.uuid);
    return res.json({ success: true, data: result.data });
  } catch (error) {
    console.error('LingoLab listConversations:', error);
    next(error);
  }
};

exports.getConversation = async (req, res, next) => {
  try {
    const result = await conversationService.getConversation(req.user.uuid, req.params.id);
    if (!result.success) return res.status(result.status || 404).json({ success: false, message: result.message });
    return res.json({ success: true, data: result.data });
  } catch (error) {
    console.error('LingoLab getConversation:', error);
    next(error);
  }
};

exports.startConversation = async (req, res, next) => {
  try {
    const result = await conversationService.startConversation(req.user.uuid, (req.body || {}).scenario);
    if (!result.success) return res.status(result.status || 400).json({ success: false, message: result.message });
    return res.json({ success: true, data: result.data });
  } catch (error) {
    console.error('LingoLab startConversation:', error);
    next(error);
  }
};

exports.sendConversationMessage = async (req, res, next) => {
  try {
    const result = await conversationService.sendMessage(req.user.uuid, req.params.id, (req.body || {}).message);
    if (!result.success) return res.status(result.status || 400).json({ success: false, message: result.message });
    return res.json({ success: true, data: result.data });
  } catch (error) {
    console.error('LingoLab sendConversationMessage:', error);
    next(error);
  }
};
