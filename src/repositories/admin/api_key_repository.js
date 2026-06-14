const { promisePool: pool } = require("../../config/db");

const create = async ({ uuid, name, key_prefix, key_hash, allowed_routes, expires_at, created_by }) => {
  const [result] = await pool.query(
    `INSERT INTO api_keys (uuid, name, key_prefix, key_hash, allowed_routes, expires_at, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [uuid, name, key_prefix, key_hash, JSON.stringify(allowed_routes), expires_at || null, created_by]
  );
  return result;
};

const findByPrefix = async (prefix) => {
  const [rows] = await pool.query(
    `SELECT id, uuid, name, key_hash, allowed_routes, status, expires_at
     FROM api_keys
     WHERE key_prefix = ? AND status = 'active' AND is_deleted = 0`,
    [prefix]
  );
  return rows;
};

const findByUuid = async (uuid) => {
  const [rows] = await pool.query(
    `SELECT id, uuid, name, key_prefix, allowed_routes, status, expires_at, last_used_at, created_by, created_at, updated_at
     FROM api_keys
     WHERE uuid = ? AND is_deleted = 0`,
    [uuid]
  );
  return rows[0] || null;
};

const findAll = async ({ page = 1, limit = 20, status = null }) => {
  const offset = (page - 1) * limit;

  let whereClause = "WHERE is_deleted = 0";
  const params = [];

  if (status) {
    whereClause += " AND status = ?";
    params.push(status);
  }

  const [countRows] = await pool.query(
    `SELECT COUNT(*) as total FROM api_keys ${whereClause}`,
    params
  );

  const [rows] = await pool.query(
    `SELECT id, uuid, name, key_prefix, allowed_routes, status, expires_at, last_used_at, created_by, created_at, updated_at
     FROM api_keys ${whereClause}
     ORDER BY created_at DESC
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

const update = async (uuid, { name, allowed_routes, expires_at }) => {
  const fields = [];
  const params = [];

  if (name !== undefined) {
    fields.push("name = ?");
    params.push(name);
  }
  if (allowed_routes !== undefined) {
    fields.push("allowed_routes = ?");
    params.push(JSON.stringify(allowed_routes));
  }
  if (expires_at !== undefined) {
    fields.push("expires_at = ?");
    params.push(expires_at);
  }

  if (fields.length === 0) return null;

  params.push(uuid);
  const [result] = await pool.query(
    `UPDATE api_keys SET ${fields.join(", ")} WHERE uuid = ? AND is_deleted = 0`,
    params
  );
  return result;
};

const updateStatus = async (uuid, status) => {
  const [result] = await pool.query(
    `UPDATE api_keys SET status = ? WHERE uuid = ? AND is_deleted = 0`,
    [status, uuid]
  );
  return result;
};

const softDelete = async (uuid) => {
  const [result] = await pool.query(
    `UPDATE api_keys SET is_deleted = 1 WHERE uuid = ? AND is_deleted = 0`,
    [uuid]
  );
  return result;
};

const updateLastUsed = (id) => {
  // Fire-and-forget — no await needed by caller
  pool.query(`UPDATE api_keys SET last_used_at = NOW() WHERE id = ?`, [id]);
};

module.exports = {
  create,
  findByPrefix,
  findByUuid,
  findAll,
  update,
  updateStatus,
  softDelete,
  updateLastUsed,
};
