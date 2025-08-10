const AdminProfileService = require("../../services/admin/profile_service");
exports.getProfile = async (req, res) => {
  try {
    const profile = await AdminProfileService.getProfileById(req.user.uuid);
    res.json({
      success: true,
      data: profile,
    });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
};
exports.updateProfile = async (req, res) => {
  try {
    await AdminProfileService.updateProfile(req.user.uuid, req.body);
    res.json({
      success: true,
      message: "Profile updated successfully",
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
