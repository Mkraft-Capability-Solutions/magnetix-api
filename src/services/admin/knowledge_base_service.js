const { promisePool: pool } = require("../../config/db");
const { v4: uuidv4 } = require("uuid");

// ========== AUDIENCE / VISIBILITY HELPERS ==========
// A KB row's `audience_roles` column is either NULL/'' (Public — visible to
// everyone, incl. logged-out) or a CSV of role ids (e.g. '3,4') restricting it
// to those roles. Valid role ids: 1=Learner, 2=Trainer, 3=Admin, 4=Super Admin.

const VALID_ROLE_IDS = [1, 2, 3, 4];

// Normalise an incoming audience value (array of ids, CSV string, or empty)
// into a clean CSV of valid unique role ids, or null for "Public".
const sanitizeAudienceRoles = (input) => {
  if (input === undefined || input === null || input === "") return null;
  const raw = Array.isArray(input) ? input : String(input).split(",");
  const ids = raw
    .map((r) => parseInt(String(r).trim(), 10))
    .filter((n) => VALID_ROLE_IDS.includes(n));
  const unique = [...new Set(ids)].sort((a, b) => a - b);
  return unique.length > 0 ? unique.join(",") : null;
};

// Build the WHERE fragment (and params) that enforces audience visibility for a
// given viewer. `viewer` shapes:
//   undefined            -> no filtering (admin management context: sees all)
//   { mode: 'all' }      -> no filtering (admin "Everything" view)
//   { mode: 'public' }   -> Public rows only
//   { roleId: number|null } -> Public rows + rows targeting that role
//                              (roleId null = anonymous -> Public rows only)
const buildAudienceClause = (viewer) => {
  if (viewer === undefined) return { sql: "", params: [] };
  if (viewer.mode === "all") return { sql: "", params: [] };
  const publicOnly = { sql: " AND (audience_roles IS NULL OR audience_roles = '')", params: [] };
  if (viewer.mode === "public") return publicOnly;
  const roleId = viewer.roleId;
  if (roleId === null || roleId === undefined) return publicOnly;
  return {
    sql: " AND (audience_roles IS NULL OR audience_roles = '' OR FIND_IN_SET(?, audience_roles))",
    params: [roleId],
  };
};

// ========== CHANGELOG ==========

const getAllChangelog = async (search = "", status = "", page = 1, limit = 20, audience = undefined) => {
  const offset = (page - 1) * limit;
  let where = "WHERE is_deleted = 0";
  const params = [];

  if (status) {
    where += " AND status = ?";
    params.push(status);
  }
  if (search) {
    where += " AND (title LIKE ? OR version LIKE ?)";
    params.push(`%${search}%`, `%${search}%`);
  }
  const aud = buildAudienceClause(audience);
  where += aud.sql;
  params.push(...aud.params);

  const [countRows] = await pool.query(
    `SELECT COUNT(*) as total FROM kb_entries ${where}`,
    params
  );

  const [rows] = await pool.query(
    `SELECT uuid, version, title, description, published_date, status, audience_roles, created_by, created_at, updated_at
     FROM kb_entries ${where}
     ORDER BY published_date DESC, created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return {
    data: rows,
    total: countRows[0].total,
    page,
    limit,
    totalPages: Math.ceil(countRows[0].total / limit),
  };
};

const getChangelogEntryByUuid = async (uuid) => {
  const [rows] = await pool.query(
    `SELECT id, uuid, version, title, description, published_date, status, audience_roles, created_by, created_at, updated_at
     FROM kb_entries WHERE uuid = ? AND is_deleted = 0`,
    [uuid]
  );

  if (rows.length === 0) return null;

  const entry = rows[0];
  const [items] = await pool.query(
    `SELECT id, type, description, sort_order
     FROM kb_entry_items WHERE kb_entry_id = ?
     ORDER BY sort_order ASC, id ASC`,
    [entry.id]
  );

  return { ...entry, items };
};

const createChangelogEntry = async (data, createdBy) => {
  const entryUuid = uuidv4();
  const { version, title, description, published_date, release_date, status, items, audience_roles } = data;
  const date = published_date || release_date;

  const [result] = await pool.query(
    `INSERT INTO kb_entries (uuid, version, title, description, published_date, status, audience_roles, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [entryUuid, version, title, description || null, date, status || "draft", sanitizeAudienceRoles(audience_roles), createdBy]
  );

  const entryId = result.insertId;

  if (items && items.length > 0) {
    const values = items.map((item, idx) => [entryId, item.type || "feature", item.description, item.sort_order ?? idx]);
    await pool.query(
      `INSERT INTO kb_entry_items (kb_entry_id, type, description, sort_order) VALUES ?`,
      [values]
    );
  }

  return getChangelogEntryByUuid(entryUuid);
};

const updateChangelogEntry = async (uuid, data) => {
  const [rows] = await pool.query(
    "SELECT id FROM kb_entries WHERE uuid = ? AND is_deleted = 0",
    [uuid]
  );
  if (rows.length === 0) throw Object.assign(new Error("Change log entry not found"), { status: 404 });

  const entryId = rows[0].id;
  const { version, title, description, published_date, release_date, status, items, audience_roles } = data;
  const date = published_date || release_date;

  const fields = [];
  const params = [];
  if (version !== undefined) { fields.push("version = ?"); params.push(version); }
  if (title !== undefined) { fields.push("title = ?"); params.push(title); }
  if (description !== undefined) { fields.push("description = ?"); params.push(description); }
  if (date !== undefined) { fields.push("published_date = ?"); params.push(date); }
  if (status !== undefined) { fields.push("status = ?"); params.push(status); }
  if (audience_roles !== undefined) { fields.push("audience_roles = ?"); params.push(sanitizeAudienceRoles(audience_roles)); }

  if (fields.length > 0) {
    params.push(uuid);
    await pool.query(`UPDATE kb_entries SET ${fields.join(", ")} WHERE uuid = ? AND is_deleted = 0`, params);
  }

  if (items !== undefined) {
    await pool.query("DELETE FROM kb_entry_items WHERE kb_entry_id = ?", [entryId]);
    if (items.length > 0) {
      const values = items.map((item, idx) => [entryId, item.type || "feature", item.description, item.sort_order ?? idx]);
      await pool.query(
        `INSERT INTO kb_entry_items (kb_entry_id, type, description, sort_order) VALUES ?`,
        [values]
      );
    }
  }

  return getChangelogEntryByUuid(uuid);
};

const publishChangelogEntry = async (uuid) => {
  const [result] = await pool.query(
    "UPDATE kb_entries SET status = 'published' WHERE uuid = ? AND is_deleted = 0",
    [uuid]
  );
  if (result.affectedRows === 0) throw Object.assign(new Error("Change log entry not found"), { status: 404 });
  return { message: "Change log entry published successfully" };
};

const unpublishChangelogEntry = async (uuid) => {
  const [result] = await pool.query(
    "UPDATE kb_entries SET status = 'draft' WHERE uuid = ? AND is_deleted = 0",
    [uuid]
  );
  if (result.affectedRows === 0) throw Object.assign(new Error("Change log entry not found"), { status: 404 });
  return { message: "Change log entry unpublished" };
};

const deleteChangelogEntry = async (uuid) => {
  const [result] = await pool.query(
    "UPDATE kb_entries SET is_deleted = 1 WHERE uuid = ? AND is_deleted = 0",
    [uuid]
  );
  if (result.affectedRows === 0) throw Object.assign(new Error("Change log entry not found"), { status: 404 });
  return { message: "Change log entry deleted successfully" };
};

// ========== FAQS ==========

const getAllFaqs = async (search = "", category = "", audience = undefined) => {
  let where = "WHERE is_deleted = 0";
  const params = [];

  if (category) { where += " AND category = ?"; params.push(category); }
  if (search) { where += " AND (question LIKE ? OR answer LIKE ?)"; params.push(`%${search}%`, `%${search}%`); }
  const aud = buildAudienceClause(audience);
  where += aud.sql;
  params.push(...aud.params);

  const [rows] = await pool.query(
    `SELECT uuid, question, answer, category, sort_order, is_active, audience_roles, created_by, created_at, updated_at
     FROM kb_faqs ${where}
     ORDER BY category ASC, sort_order ASC, created_at DESC`,
    params
  );

  return rows;
};

const createFaq = async (data, createdBy) => {
  const faqUuid = uuidv4();
  const { question, answer, category, sort_order, is_active, audience_roles } = data;

  await pool.query(
    `INSERT INTO kb_faqs (uuid, question, answer, category, sort_order, is_active, audience_roles, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [faqUuid, question, answer, category || "General", sort_order ?? 0, is_active ?? 1, sanitizeAudienceRoles(audience_roles), createdBy]
  );

  const [rows] = await pool.query("SELECT * FROM kb_faqs WHERE uuid = ?", [faqUuid]);
  return rows[0];
};

const updateFaq = async (uuid, data) => {
  const fields = [];
  const params = [];

  if (data.question !== undefined) { fields.push("question = ?"); params.push(data.question); }
  if (data.answer !== undefined) { fields.push("answer = ?"); params.push(data.answer); }
  if (data.category !== undefined) { fields.push("category = ?"); params.push(data.category); }
  if (data.sort_order !== undefined) { fields.push("sort_order = ?"); params.push(data.sort_order); }
  if (data.is_active !== undefined) { fields.push("is_active = ?"); params.push(data.is_active ? 1 : 0); }
  if (data.audience_roles !== undefined) { fields.push("audience_roles = ?"); params.push(sanitizeAudienceRoles(data.audience_roles)); }

  if (fields.length === 0) return null;

  params.push(uuid);
  const [result] = await pool.query(`UPDATE kb_faqs SET ${fields.join(", ")} WHERE uuid = ? AND is_deleted = 0`, params);
  if (result.affectedRows === 0) throw Object.assign(new Error("FAQ not found"), { status: 404 });

  const [rows] = await pool.query("SELECT * FROM kb_faqs WHERE uuid = ? AND is_deleted = 0", [uuid]);
  return rows[0];
};

const deleteFaq = async (uuid) => {
  const [result] = await pool.query("UPDATE kb_faqs SET is_deleted = 1 WHERE uuid = ? AND is_deleted = 0", [uuid]);
  if (result.affectedRows === 0) throw Object.assign(new Error("FAQ not found"), { status: 404 });
  return { message: "FAQ deleted successfully" };
};

// ========== ARTICLES ==========

const getAllArticles = async (search = "", category = "", status = "", page = 1, limit = 20, audience = undefined) => {
  const offset = (page - 1) * limit;
  let where = "WHERE is_deleted = 0";
  const params = [];

  if (status) { where += " AND status = ?"; params.push(status); }
  if (category) { where += " AND category = ?"; params.push(category); }
  if (search) { where += " AND (title LIKE ? OR content LIKE ? OR tags LIKE ?)"; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
  const aud = buildAudienceClause(audience);
  where += aud.sql;
  params.push(...aud.params);

  const [countRows] = await pool.query(`SELECT COUNT(*) as total FROM kb_articles ${where}`, params);
  const [rows] = await pool.query(
    `SELECT uuid, title, slug, content, excerpt, category, tags, cover_image, status, sort_order, audience_roles, created_by, created_at, updated_at
     FROM kb_articles ${where} ORDER BY sort_order ASC, created_at DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return { data: rows, total: countRows[0].total, page, limit, totalPages: Math.ceil(countRows[0].total / limit) };
};

const getArticleByUuid = async (uuid) => {
  const [rows] = await pool.query(
    "SELECT uuid, title, slug, content, excerpt, category, tags, cover_image, status, sort_order, audience_roles, created_by, created_at, updated_at FROM kb_articles WHERE uuid = ? AND is_deleted = 0",
    [uuid]
  );
  return rows[0] || null;
};

const getArticleBySlug = async (slug, audience = undefined) => {
  const aud = buildAudienceClause(audience);
  const [rows] = await pool.query(
    `SELECT uuid, title, slug, content, excerpt, category, tags, cover_image, status, sort_order, audience_roles, created_at, updated_at
     FROM kb_articles WHERE slug = ? AND is_deleted = 0 AND status = 'published'${aud.sql}`,
    [slug, ...aud.params]
  );
  return rows[0] || null;
};

const createArticle = async (data, createdBy) => {
  const articleUuid = uuidv4();
  const { title, slug, content, excerpt, category, tags, cover_image, status, sort_order, audience_roles } = data;
  const finalSlug = slug || title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  await pool.query(
    `INSERT INTO kb_articles (uuid, title, slug, content, excerpt, category, tags, cover_image, status, sort_order, audience_roles, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [articleUuid, title, finalSlug, content, excerpt || null, category || "General", tags || null, cover_image || null, status || "draft", sort_order ?? 0, sanitizeAudienceRoles(audience_roles), createdBy]
  );

  return getArticleByUuid(articleUuid);
};

const updateArticle = async (uuid, data) => {
  const fields = [];
  const params = [];

  if (data.title !== undefined) { fields.push("title = ?"); params.push(data.title); }
  if (data.slug !== undefined) { fields.push("slug = ?"); params.push(data.slug); }
  if (data.content !== undefined) { fields.push("content = ?"); params.push(data.content); }
  if (data.excerpt !== undefined) { fields.push("excerpt = ?"); params.push(data.excerpt); }
  if (data.category !== undefined) { fields.push("category = ?"); params.push(data.category); }
  if (data.tags !== undefined) { fields.push("tags = ?"); params.push(data.tags); }
  if (data.cover_image !== undefined) { fields.push("cover_image = ?"); params.push(data.cover_image); }
  if (data.status !== undefined) { fields.push("status = ?"); params.push(data.status); }
  if (data.sort_order !== undefined) { fields.push("sort_order = ?"); params.push(data.sort_order); }
  if (data.audience_roles !== undefined) { fields.push("audience_roles = ?"); params.push(sanitizeAudienceRoles(data.audience_roles)); }

  if (fields.length === 0) return getArticleByUuid(uuid);

  params.push(uuid);
  const [result] = await pool.query(`UPDATE kb_articles SET ${fields.join(", ")} WHERE uuid = ? AND is_deleted = 0`, params);
  if (result.affectedRows === 0) throw Object.assign(new Error("Article not found"), { status: 404 });

  return getArticleByUuid(uuid);
};

const deleteArticle = async (uuid) => {
  const [result] = await pool.query("UPDATE kb_articles SET is_deleted = 1 WHERE uuid = ? AND is_deleted = 0", [uuid]);
  if (result.affectedRows === 0) throw Object.assign(new Error("Article not found"), { status: 404 });
  return { message: "Article deleted successfully" };
};

module.exports = {
  getAllChangelog,
  getChangelogEntryByUuid,
  createChangelogEntry,
  updateChangelogEntry,
  publishChangelogEntry,
  unpublishChangelogEntry,
  deleteChangelogEntry,
  getAllFaqs,
  createFaq,
  updateFaq,
  deleteFaq,
  getAllArticles,
  getArticleByUuid,
  getArticleBySlug,
  createArticle,
  updateArticle,
  deleteArticle,
  sanitizeAudienceRoles,
  buildAudienceClause,
};
