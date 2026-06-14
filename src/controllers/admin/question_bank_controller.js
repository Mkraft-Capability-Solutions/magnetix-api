const questionBankService = require('../../services/admin/question_bank_service');

const sendError = (res, error, fallbackMessage) => {
  const status = error?.statusCode || 500;
  res.status(status).json({
    success: false,
    message: error?.message || fallbackMessage,
  });
};

exports.listQuestions = async (req, res) => {
  try {
    const { search, topic, type } = req.query;
    const data = await questionBankService.listQuestions({ search, topic, type });
    res.json({ success: true, data });
  } catch (error) {
    console.error('QuestionBank - listQuestions error:', error);
    sendError(res, error, 'Failed to fetch questions');
  }
};

exports.getQuestion = async (req, res) => {
  try {
    const data = await questionBankService.getQuestion(req.params.id);
    if (!data) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }
    res.json({ success: true, data });
  } catch (error) {
    console.error('QuestionBank - getQuestion error:', error);
    sendError(res, error, 'Failed to fetch question');
  }
};

exports.createQuestion = async (req, res) => {
  try {
    const data = await questionBankService.createQuestion(req.body, req.user?.uuid);
    res.status(201).json({ success: true, data, message: 'Question created' });
  } catch (error) {
    console.error('QuestionBank - createQuestion error:', error);
    sendError(res, error, 'Failed to create question');
  }
};

exports.updateQuestion = async (req, res) => {
  try {
    const data = await questionBankService.updateQuestion(req.params.id, req.body);
    res.json({ success: true, data, message: 'Question updated' });
  } catch (error) {
    console.error('QuestionBank - updateQuestion error:', error);
    sendError(res, error, 'Failed to update question');
  }
};

exports.deleteQuestion = async (req, res) => {
  try {
    const data = await questionBankService.deleteQuestion(req.params.id);
    res.json({ success: true, data, message: 'Question deleted' });
  } catch (error) {
    console.error('QuestionBank - deleteQuestion error:', error);
    sendError(res, error, 'Failed to delete question');
  }
};
