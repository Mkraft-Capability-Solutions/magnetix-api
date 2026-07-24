const express = require("express");
const router = express.Router();
const controller = require("../controllers/admin/knowledge_base_controller");
const { optionalAuthenticate } = require("../middleware/auth_middleware");

// Public routes — open to logged-out visitors. `optionalAuthenticate` attaches
// req.user WHEN a valid token is present (never rejects) so the controller can
// scope results to the viewer's role. Anonymous viewers see Public content only.
router.get("/changelog", optionalAuthenticate, controller.getPublishedChangelog);
router.get("/faqs", optionalAuthenticate, controller.getActiveFaqs);
router.get("/articles", optionalAuthenticate, controller.getPublishedArticles);
router.get("/articles/:slug", optionalAuthenticate, controller.getArticleBySlug);

module.exports = router;
