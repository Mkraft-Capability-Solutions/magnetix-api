const teamService = require('../../services/student/team_service');

const getMyTeams = async (req, res) => {
  try {
    const teams = await teamService.getMyTeams(req.user.uuid);
    res.json({ success: true, data: teams });
  } catch (error) {
    console.error('Student TeamController - getMyTeams error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch your teams'
    });
  }
};

const getMyTeamMembers = async (req, res) => {
  try {
    const teamId = parseInt(req.params.teamId, 10);
    if (Number.isNaN(teamId)) {
      return res.status(400).json({ success: false, message: 'Invalid teamId' });
    }
    const members = await teamService.getMyTeamMembers(req.user.uuid, teamId);
    res.json({ success: true, data: members });
  } catch (error) {
    console.error('Student TeamController - getMyTeamMembers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch team members'
    });
  }
};

module.exports = { getMyTeams, getMyTeamMembers };
