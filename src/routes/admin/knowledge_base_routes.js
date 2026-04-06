const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../../middleware/auth_middleware");
const controller = require("../../controllers/admin/knowledge_base_controller");

router.use(authenticate);
router.use(authorize(3, 4));

// Changelog CRUD
router.get("/", controller.getAllChangelog);
router.post("/", controller.createChangelogEntry);

// FAQs CRUD
router.get("/faqs/list", controller.getAllFaqs);
router.post("/faqs", controller.createFaq);
router.put("/faqs/:uuid", controller.updateFaq);
router.delete("/faqs/:uuid", controller.deleteFaq);

// Articles CRUD
router.get("/articles/list", controller.getAllArticles);
router.post("/articles", controller.createArticle);
router.get("/articles/:uuid", controller.getArticleByUuid);
router.put("/articles/:uuid", controller.updateArticle);
router.delete("/articles/:uuid", controller.deleteArticle);

// Changelog by uuid (after /faqs and /articles)
router.get("/:uuid", controller.getChangelogEntryByUuid);
router.put("/:uuid/publish", controller.publishChangelogEntry);
router.put("/:uuid/unpublish", controller.unpublishChangelogEntry);
router.put("/:uuid", controller.updateChangelogEntry);
router.delete("/:uuid", controller.deleteChangelogEntry);

module.exports = router;
