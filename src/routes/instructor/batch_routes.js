const express = require("express");
const router = express.Router();
const adminBatchController = require("../../controllers/admin/batch_controller");
const { authenticate, authorize } = require("../../middleware/auth_middleware");

router.use(authenticate);
// Allow only instructors (2) and admins (3, 4) to access batches
router.use(authorize(2, 3, 4));

router.get("/", adminBatchController.getAllBatches);

module.exports = router;
