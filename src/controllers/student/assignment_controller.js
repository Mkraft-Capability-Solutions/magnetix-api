const studentAssignmentService = require('../../services/student/assignment_service');
const sharedAssignmentService = require('../../services/assignment_service');

const sendError = (res, error) => {
  const status = error.statusCode || 500;
  if (status >= 500) console.error('Student assignment error:', error);
  res.status(status).json({ success: false, message: error.message || 'Internal error' });
};

exports.listAssignments = async (req, res) => {
  try {
    const { rows, total } = await studentAssignmentService.listForLearner(req.user.uuid, req.query);
    res.json({
      success: true,
      data: rows,
      pagination: {
        total,
        limit: Math.min(parseInt(req.query.limit, 10) || 25, 200),
        offset: parseInt(req.query.offset, 10) || 0
      }
    });
  } catch (error) {
    sendError(res, error);
  }
};

exports.getAssignment = async (req, res) => {
  try {
    if (!req.assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found' });
    }
    const detail = await studentAssignmentService.getForLearner(req.user.uuid, req.assignment.id);
    if (!detail) {
      return res.status(404).json({ success: false, message: 'Assignment not found' });
    }
    res.json({ success: true, data: detail });
  } catch (error) {
    sendError(res, error);
  }
};

exports.submitDocument = async (req, res) => {
  try {
    if (!req.assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found' });
    }
    const assignment = await sharedAssignmentService.getAssignmentById(req.assignment.id);
    const file = req.file;
    const notes = (req.body && req.body.notes) || null;
    const submission = await studentAssignmentService.submitDocument(req.user.uuid, assignment, file, notes);
    res.status(201).json({ success: true, data: submission });
  } catch (error) {
    sendError(res, error);
  }
};

exports.submitAssessment = async (req, res) => {
  try {
    if (!req.assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found' });
    }
    const assignment = await sharedAssignmentService.getAssignmentById(req.assignment.id);
    const answers = (req.body && req.body.answers) || [];
    const notes = (req.body && req.body.notes) || null;
    const result = await studentAssignmentService.submitAssessment(req.user.uuid, assignment, answers, notes);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    sendError(res, error);
  }
};
