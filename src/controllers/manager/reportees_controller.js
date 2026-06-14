const reporteesService = require('../../services/manager/reportees_service');

const sendError = (res, error) => {
  const status = error.statusCode || 500;
  if (status >= 500) console.error('Manager reportees error:', error);
  res.status(status).json({ success: false, message: error.message || 'Internal error' });
};

exports.listReportees = async (req, res) => {
  try {
    const data = await reporteesService.listReportees(req.user.uuid);
    res.json({ success: true, data });
  } catch (error) {
    sendError(res, error);
  }
};

exports.listReporteeSubmissions = async (req, res) => {
  try {
    const { rows, total } = await reporteesService.listReporteeSubmissions(req.user.uuid, req.query);
    res.json({
      success: true,
      data: rows,
      pagination: {
        total,
        limit: Math.min(parseInt(req.query.limit, 10) || 50, 500),
        offset: parseInt(req.query.offset, 10) || 0
      }
    });
  } catch (error) {
    sendError(res, error);
  }
};

exports.getReportee = async (req, res) => {
  try {
    const reporteeId = req.params.userId;
    if (!reporteeId) {
      return res.status(400).json({ success: false, message: 'userId is required' });
    }
    const result = await reporteesService.getReportee(req.user.uuid, reporteeId);
    if (!result) {
      return res.status(404).json({ success: false, message: 'Reportee not found' });
    }
    res.json({ success: true, data: result });
  } catch (error) {
    sendError(res, error);
  }
};
