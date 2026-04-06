const express = require("express");
const router = express.Router();
const controller = require("../controllers/admin/knowledge_base_controller");

// Public routes — no authentication required
router.get("/changelog", controller.getPublishedChangelog);
router.get("/faqs", controller.getActiveFaqs);
router.get("/articles", controller.getPublishedArticles);
router.get("/articles/:slug", controller.getArticleBySlug);

module.exports = router;
