const AdminBatchService = require("../../services/admin/batch_service");

exports.getAllBatches = async (req, res) => {
  try {
    const batches = await AdminBatchService.getAllBatches();
    res.json({
      success: true,
      data: batches,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
