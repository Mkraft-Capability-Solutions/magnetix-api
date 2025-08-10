const express = require("express");
const router = express.Router();
const adminProfileController = require("../../controllers/admin/profile_controller");
const { authenticate, authorize } = require("../../middleware/auth_middleware");

router.use(authenticate);
router.use(authorize(3));

router.get("/", adminProfileController.getProfile);
router.put("/", adminProfileController.updateProfile);
module.exports = router;
