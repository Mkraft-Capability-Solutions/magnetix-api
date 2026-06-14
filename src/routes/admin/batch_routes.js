const express = require("express");
const router = express.Router();
const adminBatchController = require("../../controllers/admin/batch_controller");
const { authenticate, authorize } = require("../../middleware/auth_middleware");

router.use(authenticate);
// Allow instructors (2), admins (3), and super admins (4) to access batches
router.use(authorize(2, 3, 4));

router.get("/", adminBatchController.getAllBatches);

module.exports = router;
