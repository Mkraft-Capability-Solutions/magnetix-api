const learningItemService = require('../../services/admin/learning_item_service');

// ─── catalogue ────────────────────────────────────────────────────────────────

exports.getCourses = async (req, res) => {
  try {
    const courses = await learningItemService.getCourses();
    res.json({ success: true, data: courses });
  } catch (err) {
    console.error('LearningItem - getCourses:', err.message);
    res.status(500).json({ success: false, error: { message: 'Failed to fetch courses' } });
  }
};

exports.getQuizzes = async (req, res) => {
  try {
    const quizzes = await learningItemService.getQuizzes();
    res.json({ success: true, data: quizzes });
  } catch (err) {
    console.error('LearningItem - getQuizzes:', err.message);
    res.status(500).json({ success: false, error: { message: 'Failed to fetch quizzes' } });
  }
};

// ─── instances ────────────────────────────────────────────────────────────────

exports.createInstance = async (req, res) => {
  try {
    const userId = req.user.uuid || req.user.id;
    const result = await learningItemService.createInstance(userId, req.body);
    res.status(201).json({ success: true, data: result, message: 'Instance created successfully' });
  } catch (err) {
    console.error('LearningItem - createInstance:', err.message);

    if (err.message.startsWith('VALIDATION_ERROR:')) {
      return res.status(400).json({
        success: false,
        error: { message: err.message.replace('VALIDATION_ERROR: ', '') },
      });
    }
    res.status(500).json({ success: false, error: { message: 'Failed to create instance' } });
  }
};

exports.getInstances = async (req, res) => {
  try {
    const { itemType, status, page, limit } = req.query;
    const result = await learningItemService.getInstances({
      itemType,
      status,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
    });
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('LearningItem - getInstances:', err.message, err.stack);
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};

exports.getInstanceById = async (req, res) => {
  try {
    const instance = await learningItemService.getInstanceById(req.params.id);
    if (!instance) {
      return res.status(404).json({ success: false, error: { message: 'Instance not found' } });
    }
    res.json({ success: true, data: instance });
  } catch (err) {
    console.error('LearningItem - getInstanceById:', err.message);
    res.status(500).json({ success: false, error: { message: 'Failed to fetch instance' } });
  }
};

exports.updateInstance = async (req, res) => {
  try {
    const userId = req.user.uuid || req.user.id;
    await learningItemService.updateInstance(req.params.id, userId, req.body);
    res.json({ success: true, message: 'Instance updated successfully' });
  } catch (err) {
    console.error('LearningItem - updateInstance:', err.message);

    if (err.message.startsWith('VALIDATION_ERROR:')) {
      return res.status(400).json({
        success: false,
        error: { message: err.message.replace('VALIDATION_ERROR: ', '') },
      });
    }
    res.status(500).json({ success: false, error: { message: 'Failed to update instance' } });
  }
};

exports.deleteInstance = async (req, res) => {
  try {
    await learningItemService.deleteInstance(req.params.id);
    res.json({ success: true, message: 'Instance deleted' });
  } catch (err) {
    console.error('LearningItem - deleteInstance:', err.message);
    res.status(500).json({ success: false, error: { message: 'Failed to delete instance' } });
  }
};

exports.closeInstance = async (req, res) => {
  try {
    await learningItemService.closeInstance(req.params.id);
    res.json({ success: true, message: 'Instance closed' });
  } catch (err) {
    console.error('LearningItem - closeInstance:', err.message);
    res.status(500).json({ success: false, error: { message: 'Failed to close instance' } });
  }
};

exports.getInstanceProgress = async (req, res) => {
  try {
    const rows = await learningItemService.getInstanceProgress(req.params.id);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('LearningItem - getInstanceProgress:', err.message);
    res.status(500).json({ success: false, error: { message: 'Failed to fetch progress' } });
  }
};
