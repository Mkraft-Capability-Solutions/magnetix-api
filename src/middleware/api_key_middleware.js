const bcrypt = require("bcryptjs");
const apiKeyRepository = require("../repositories/admin/api_key_repository");
const { authenticate } = require("./auth_middleware");

/**
 * Convert a route pattern with wildcards to a RegExp.
 *   /api/admin/reports/*  → matches one path segment
 *   /api/admin/**         → matches any sub-path
 *   /api/student/courses  → exact match
 */
const patternToRegex = (pattern) => {
  // Escape regex special chars except *
  let escaped = pattern.replace(/([.+?^${}()|[\]\\])/g, "\\$1");
  // Replace ** first (deep wildcard — any sub-path)
  escaped = escaped.replace(/\*\*/g, "@@DOUBLE@@");
  // Replace single * (one path segment)
  escaped = escaped.replace(/\*/g, "[^/]+");
  // Put back double wildcard
  escaped = escaped.replace(/@@DOUBLE@@/g, ".*");
  return new RegExp("^" + escaped + "/?$");
};

/**
 * Check if a request path matches any of the allowed route patterns.
 */
const isRouteAllowed = (requestPath, allowedRoutes) => {
  // Strip query string for matching
  const path = requestPath.split("?")[0];

  for (const pattern of allowedRoutes) {
    if (patternToRegex(pattern).test(path)) {
      return true;
    }
  }
  return false;
};

/**
 * Middleware: authenticate requests using x-api-key header.
 */
const authenticateApiKey = async (req, res, next) => {
  try {
    const apiKey = req.header("x-api-key");
    if (!apiKey) {
      return res.status(401).json({ message: "No API key provided" });
    }

    if (apiKey.length < 12) {
      return res.status(401).json({ message: "Invalid API key" });
    }

    // Extract prefix for efficient DB lookup
    const prefix = apiKey.substring(0, 12);
    const candidates = await apiKeyRepository.findByPrefix(prefix);

    if (candidates.length === 0) {
      return res.status(401).json({ message: "Invalid API key" });
    }

    // Compare against candidate hashes
    let matchedKey = null;
    for (const candidate of candidates) {
      const isMatch = await bcrypt.compare(apiKey, candidate.key_hash);
      if (isMatch) {
        matchedKey = candidate;
        break;
      }
    }

    if (!matchedKey) {
      return res.status(401).json({ message: "Invalid API key" });
    }

    // Check expiry
    if (matchedKey.expires_at && new Date(matchedKey.expires_at) < new Date()) {
      return res.status(401).json({ message: "API key has expired" });
    }

    // Parse allowed_routes (may already be parsed by mysql2 JSON handling)
    const allowedRoutes =
      typeof matchedKey.allowed_routes === "string"
        ? JSON.parse(matchedKey.allowed_routes)
        : matchedKey.allowed_routes;

    // Check route access
    if (!isRouteAllowed(req.originalUrl, allowedRoutes)) {
      return res.status(403).json({
        message: "This API key does not have access to this endpoint",
      });
    }

    // Fire-and-forget: update last_used_at
    apiKeyRepository.updateLastUsed(matchedKey.id);

    // Attach API key info to request
    req.apiKey = {
      uuid: matchedKey.uuid,
      name: matchedKey.name,
      allowed_routes: allowedRoutes,
    };

    next();
  } catch (error) {
    console.error("API Key Middleware error:", error);
    res.status(401).json({ message: "API key authentication failed" });
  }
};

/**
 * Middleware: accept either x-api-key or JWT Bearer token.
 * If x-api-key header is present, use API key auth.
 * Otherwise, fall through to JWT authentication.
 */
const authenticateAny = async (req, res, next) => {
  if (req.header("x-api-key")) {
    return authenticateApiKey(req, res, next);
  }
  return authenticate(req, res, next);
};

module.exports = {
  authenticateApiKey,
  authenticateAny,
};
