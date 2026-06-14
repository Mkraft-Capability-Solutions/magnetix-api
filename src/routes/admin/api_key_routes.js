const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../../middleware/auth_middleware");
const apiKeyController = require("../../controllers/admin/api_key_controller");

// All routes require admin or super admin
router.use(authenticate);
router.use(authorize(3, 4));

router.post("/", apiKeyController.createApiKey);
router.get("/", apiKeyController.listApiKeys);
router.get("/available-routes", apiKeyController.getAvailableRoutes);
router.get("/:uuid", apiKeyController.getApiKey);
router.put("/:uuid", apiKeyController.updateApiKey);
router.patch("/:uuid/revoke", apiKeyController.revokeApiKey);
router.patch("/:uuid/activate", apiKeyController.activateApiKey);
router.delete("/:uuid", apiKeyController.deleteApiKey);

module.exports = router;
