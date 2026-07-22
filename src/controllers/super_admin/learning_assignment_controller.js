const service = require('../../services/super_admin/learning_assignment_service');

/**
 * Learning Assignment controller (Super Admin).
 * Thin HTTP layer over learning_assignment_service. Actor = req.user.uuid.
 */

exports.createAssignment = async (req, res, next) => {
  try {
    const result = await service.createAssignment(req.body || {}, req.user.uuid);
    if (!result.success) {
      return res.status(result.status || 400).json({ success: false, message: result.message });
    }
    return res.status(201).json({ success: true, message: result.message, data: result.data });
  } catch (error) {
    console.error('Error in createAssignment:', error);
    next(error);
  }
};

exports.listAssignments = async (req, res, next) => {
  try {
    const result = await service.listAssignments();
    return res.json({ success: true, data: result.data });
  } catch (error) {
    console.error('Error in listAssignments:', error);
    next(error);
  }
};

exports.getAssignmentDetail = async (req, res, next) => {
  try {
    const result = await service.getAssignmentDetail(req.params.id);
    if (!result.success) {
      return res.status(result.status || 404).json({ success: false, message: result.message });
    }
    return res.json({ success: true, data: result.data });
  } catch (error) {
    console.error('Error in getAssignmentDetail:', error);
    next(error);
  }
};
