const service = require('../../services/admin/organization_member_activity_service');

const handle = (fn) => async (req, res) => {
  try {
    const result = await fn(req);
    if (!result.success) {
      return res.status(400).json({ success: false, message: result.error?.message || 'Bad request' });
    }
    res.json({ success: true, data: result.data });
  } catch (err) {
    console.error('OrgMemberActivityController error:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'Internal server error'
    });
  }
};

exports.getOverview         = handle((req) => service.getOverview(req.params.userId));
exports.getEnrolledCourses  = handle((req) => service.getEnrolledCourses(req.params.userId));
exports.getAssessments      = handle((req) => service.getAssessments(req.params.userId));
exports.getCertificates     = handle((req) => service.getCertificates(req.params.userId));
exports.getLearningHours    = handle((req) => service.getLearningHours(req.params.userId, req.query.days || req.query.range || 30));
exports.getEnrollableCourses    = handle((req) => service.getEnrollableCourses(req.params.userId, req.query.search || ''));
exports.getAssignableAssessments = handle((req) => service.getAssignableAssessments(req.params.userId, req.query.search || ''));

exports.enrollInCourse = handle((req) => {
  const { courseId } = req.body || {};
  if (!courseId) return Promise.resolve({ success: false, error: { message: 'courseId is required' } });
  return service.enrollMemberInCourse(req.params.userId, courseId);
});

exports.assignAssessment = handle((req) => {
  const { formId, dueDate } = req.body || {};
  if (!formId) return Promise.resolve({ success: false, error: { message: 'formId is required' } });
  return service.assignAssessment(req.params.userId, formId, dueDate || null, req.user.uuid);
});
