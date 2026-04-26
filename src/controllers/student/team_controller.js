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

module.exports = { getMyTeams };
