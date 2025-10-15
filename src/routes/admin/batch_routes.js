const express = require("express");
const router = express.Router();
const adminBatchController = require("../../controllers/admin/batch_controller");
const { authenticate, authorize } = require("../../middleware/auth_middleware");

router.use(authenticate);
router.use(authorize(3));

router.get("/", adminBatchController.getAllBatches);

module.exports = router;
