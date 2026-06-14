const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const apiKeyRepository = require("../../repositories/admin/api_key_repository");

const generateApiKey = async (name, allowedRoutes, expiresAt, createdBy) => {
  // Generate raw key: mk_ + 64 hex chars = 67 chars total
  const rawKey = "mk_" + crypto.randomBytes(32).toString("hex");
  const keyPrefix = rawKey.substring(0, 12);
  const keyHash = await bcrypt.hash(rawKey, 10);
  const keyUuid = uuidv4();

  await apiKeyRepository.create({
    uuid: keyUuid,
    name,
    key_prefix: keyPrefix,
    key_hash: keyHash,
    allowed_routes: allowedRoutes,
    expires_at: expiresAt || null,
    created_by: createdBy,
  });

  // Return the raw key — this is the ONLY time it will be shown
  return {
    uuid: keyUuid,
    name,
    key: rawKey,
    key_prefix: keyPrefix,
    allowed_routes: allowedRoutes,
    expires_at: expiresAt || null,
  };
};

const listApiKeys = async (page, limit, status) => {
  return apiKeyRepository.findAll({ page, limit, status });
};

const getApiKey = async (uuid) => {
  const key = await apiKeyRepository.findByUuid(uuid);
  if (!key) {
    throw Object.assign(new Error("API key not found"), { status: 404 });
  }
  return key;
};

const updateApiKey = async (uuid, updates) => {
  const key = await apiKeyRepository.findByUuid(uuid);
  if (!key) {
    throw Object.assign(new Error("API key not found"), { status: 404 });
  }

  await apiKeyRepository.update(uuid, updates);
  return apiKeyRepository.findByUuid(uuid);
};

const revokeApiKey = async (uuid) => {
  const key = await apiKeyRepository.findByUuid(uuid);
  if (!key) {
    throw Object.assign(new Error("API key not found"), { status: 404 });
  }

  await apiKeyRepository.updateStatus(uuid, "revoked");
  return { message: "API key revoked successfully" };
};

const activateApiKey = async (uuid) => {
  const key = await apiKeyRepository.findByUuid(uuid);
  if (!key) {
    throw Object.assign(new Error("API key not found"), { status: 404 });
  }

  await apiKeyRepository.updateStatus(uuid, "active");
  return { message: "API key activated successfully" };
};

const deleteApiKey = async (uuid) => {
  const key = await apiKeyRepository.findByUuid(uuid);
  if (!key) {
    throw Object.assign(new Error("API key not found"), { status: 404 });
  }

  await apiKeyRepository.softDelete(uuid);
  return { message: "API key deleted successfully" };
};

module.exports = {
  generateApiKey,
  listApiKeys,
  getApiKey,
  updateApiKey,
  revokeApiKey,
  activateApiKey,
  deleteApiKey,
};
