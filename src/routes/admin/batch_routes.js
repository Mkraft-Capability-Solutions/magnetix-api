const express = require("express");
const router = express.Router();
const adminBatchController = require("../../controllers/admin/batch_controller");
const { authenticate, authorize } = require("../../middleware/auth_middleware");

router.use(authenticate);
// Allow both admins (3) and instructors (2) to access batches
router.use(authorize(2, 3));

router.get("/", adminBatchController.getAllBatches);

module.exports = router;
