const kbService = require("../../services/admin/knowledge_base_service");

// ========== CHANGELOG ==========

exports.getAllChangelog = async (req, res) => {
  try {
    const { search, status, page, limit } = req.query;
    const result = await kbService.getAllChangelog(search || "", status || "", parseInt(page) || 1, parseInt(limit) || 20);
    res.json({ success: true, data: result.data, pagination: { total: result.total, page: result.page, limit: result.limit, totalPages: result.totalPages } });
  } catch (error) {
    console.error("KnowledgeBase Controller - getAllChangelog error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch changelog", error: error.message });
  }
};

exports.getChangelogEntryByUuid = async (req, res) => {
  try {
    const entry = await kbService.getChangelogEntryByUuid(req.params.uuid);
    if (!entry) return res.status(404).json({ success: false, message: "Changelog entry not found" });
    res.json({ success: true, data: entry });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

exports.createChangelogEntry = async (req, res) => {
  try {
    const { version, title, description, published_date, release_date, status, items } = req.body;
    const date = published_date || release_date;
    if (!version || !title || !date) {
      return res.status(400).json({ success: false, message: "version, title, and published_date are required" });
    }
    const entry = await kbService.createChangelogEntry(
      { version, title, description, release_date: date, status, items: items || [] },
      req.user.uuid
    );
    res.status(201).json({ success: true, message: "Changelog entry created", data: entry });
  } catch (error) {
    console.error("KnowledgeBase Controller - createChangelogEntry error:", error);
    res.status(500).json({ success: false, message: "Failed to create changelog entry", error: error.message });
  }
};

exports.updateChangelogEntry = async (req, res) => {
  try {
    const entry = await kbService.updateChangelogEntry(req.params.uuid, req.body);
    res.json({ success: true, message: "Changelog entry updated", data: entry });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

exports.publishChangelogEntry = async (req, res) => {
  try {
    const result = await kbService.publishChangelogEntry(req.params.uuid);
    res.json({ success: true, message: result.message });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

exports.unpublishChangelogEntry = async (req, res) => {
  try {
    const result = await kbService.unpublishChangelogEntry(req.params.uuid);
    res.json({ success: true, message: result.message });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

exports.deleteChangelogEntry = async (req, res) => {
  try {
    const result = await kbService.deleteChangelogEntry(req.params.uuid);
    res.json({ success: true, message: result.message });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

// ========== FAQS ==========

exports.getAllFaqs = async (req, res) => {
  try {
    const { search, category } = req.query;
    const faqs = await kbService.getAllFaqs(search || "", category || "");
    res.json({ success: true, data: faqs });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch FAQs", error: error.message });
  }
};

exports.createFaq = async (req, res) => {
  try {
    const { question, answer } = req.body;
    if (!question || !answer) return res.status(400).json({ success: false, message: "question and answer are required" });
    const faq = await kbService.createFaq(req.body, req.user.uuid);
    res.status(201).json({ success: true, message: "FAQ created", data: faq });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to create FAQ", error: error.message });
  }
};

exports.updateFaq = async (req, res) => {
  try {
    const faq = await kbService.updateFaq(req.params.uuid, req.body);
    res.json({ success: true, message: "FAQ updated", data: faq });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

exports.deleteFaq = async (req, res) => {
  try {
    const result = await kbService.deleteFaq(req.params.uuid);
    res.json({ success: true, message: result.message });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

// ========== ARTICLES ==========

exports.getAllArticles = async (req, res) => {
  try {
    const { search, category, status, page, limit } = req.query;
    const result = await kbService.getAllArticles(search || "", category || "", status || "", parseInt(page) || 1, parseInt(limit) || 20);
    res.json({ success: true, data: result.data, pagination: { total: result.total, page: result.page, limit: result.limit, totalPages: result.totalPages } });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch articles", error: error.message });
  }
};

exports.getArticleByUuid = async (req, res) => {
  try {
    const article = await kbService.getArticleByUuid(req.params.uuid);
    if (!article) return res.status(404).json({ success: false, message: "Article not found" });
    res.json({ success: true, data: article });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

exports.createArticle = async (req, res) => {
  try {
    const { title, content } = req.body;
    if (!title || !content) return res.status(400).json({ success: false, message: "title and content are required" });
    const article = await kbService.createArticle(req.body, req.user.uuid);
    res.status(201).json({ success: true, message: "Article created", data: article });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to create article", error: error.message });
  }
};

exports.updateArticle = async (req, res) => {
  try {
    const article = await kbService.updateArticle(req.params.uuid, req.body);
    res.json({ success: true, message: "Article updated", data: article });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

exports.deleteArticle = async (req, res) => {
  try {
    const result = await kbService.deleteArticle(req.params.uuid);
    res.json({ success: true, message: result.message });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

// ========== PUBLIC (no auth required) ==========

exports.getPublishedChangelog = async (req, res) => {
  try {
    const result = await kbService.getAllChangelog("", "published", 1, 50);
    const entries = [];
    for (const entry of result.data) {
      const full = await kbService.getChangelogEntryByUuid(entry.uuid);
      if (full) entries.push(full);
    }
    res.json({ success: true, data: entries });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch changelog" });
  }
};

exports.getActiveFaqs = async (req, res) => {
  try {
    const faqs = await kbService.getAllFaqs("", "");
    const active = faqs.filter((f) => f.is_active);
    res.json({ success: true, data: active });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch FAQs" });
  }
};

exports.getPublishedArticles = async (req, res) => {
  try {
    const result = await kbService.getAllArticles("", "", "published", 1, 100);
    res.json({ success: true, data: result.data });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch articles" });
  }
};

exports.getArticleBySlug = async (req, res) => {
  try {
    const article = await kbService.getArticleBySlug(req.params.slug);
    if (!article) return res.status(404).json({ success: false, message: "Article not found" });
    res.json({ success: true, data: article });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch article" });
  }
};
