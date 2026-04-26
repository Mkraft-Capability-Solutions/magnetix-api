const { promisePool } = require('../../config/db');
const adminTeamService = require('../../services/admin/team_service');
const managerAssignmentService = require('../../services/manager/assignment_service');

const sendError = (res, error) => {
  const status = error.statusCode || 500;
  if (status >= 500) console.error('Manager team error:', error);
  res.status(status).json({ success: false, message: error.message || 'Internal error' });
};

exports.listMyTeams = async (req, res) => {
  try {
    const teams = await managerAssignmentService.listManagedTeams(req.user.uuid);
    res.json({ success: true, data: teams });
  } catch (error) {
    sendError(res, error);
  }
};

exports.getTeamMembers = async (req, res) => {
  try {
    const teamId = parseInt(req.params.teamId, 10);
    if (Number.isNaN(teamId)) {
      return res.status(400).json({ success: false, message: 'Invalid teamId' });
    }
    // requireManagerOfTeam middleware already authorized this caller, but the
    // admin service re-runs its own access check. Pass caller identity through
    // so the assert can recognize them as the team's manager (not just as an
    // org member).
    const members = await adminTeamService.getTeamMembers(teamId, req.user.uuid, req.user.role_id);
    res.json({ success: true, data: members });
  } catch (error) {
    sendError(res, error);
  }
};

exports.getTeamLearningHistory = async (req, res) => {
  try {
    const teamId = parseInt(req.params.teamId, 10);
    if (Number.isNaN(teamId)) {
      return res.status(400).json({ success: false, message: 'Invalid teamId' });
    }
    const { userId, status } = req.query;
    const data = await adminTeamService.getLearningHistory(
      teamId,
      userId || null,
      status || null,
      req.user.uuid,
      req.user.role_id
    );
    res.json({ success: true, data });
  } catch (error) {
    sendError(res, error);
  }
};
