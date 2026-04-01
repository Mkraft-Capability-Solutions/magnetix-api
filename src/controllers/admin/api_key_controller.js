const apiKeyService = require("../../services/admin/api_key_service");
const {
  createApiKeySchema,
  updateApiKeySchema,
} = require("../../validators/api_key_validator");

exports.createApiKey = async (req, res) => {
  try {
    const { error, value } = createApiKeySchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const result = await apiKeyService.generateApiKey(
      value.name,
      value.allowed_routes,
      value.expires_at || null,
      req.user.uuid
    );

    res.status(201).json({
      success: true,
      message:
        "API key created successfully. Save the key now — it will not be shown again.",
      data: result,
    });
  } catch (error) {
    console.error("API Key Controller - createApiKey error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create API key",
      error: error.message,
    });
  }
};

exports.listApiKeys = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const status = req.query.status || null;

    const result = await apiKeyService.listApiKeys(page, limit, status);

    res.json({
      success: true,
      data: result.data,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    console.error("API Key Controller - listApiKeys error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch API keys",
      error: error.message,
    });
  }
};

exports.getApiKey = async (req, res) => {
  try {
    const key = await apiKeyService.getApiKey(req.params.uuid);

    res.json({
      success: true,
      data: key,
    });
  } catch (error) {
    console.error("API Key Controller - getApiKey error:", error);
    const status = error.status || 500;
    res.status(status).json({
      success: false,
      message: error.message || "Failed to fetch API key",
    });
  }
};

exports.updateApiKey = async (req, res) => {
  try {
    const { error, value } = updateApiKeySchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const updated = await apiKeyService.updateApiKey(req.params.uuid, value);

    res.json({
      success: true,
      message: "API key updated successfully",
      data: updated,
    });
  } catch (error) {
    console.error("API Key Controller - updateApiKey error:", error);
    const status = error.status || 500;
    res.status(status).json({
      success: false,
      message: error.message || "Failed to update API key",
    });
  }
};

exports.revokeApiKey = async (req, res) => {
  try {
    const result = await apiKeyService.revokeApiKey(req.params.uuid);

    res.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error("API Key Controller - revokeApiKey error:", error);
    const status = error.status || 500;
    res.status(status).json({
      success: false,
      message: error.message || "Failed to revoke API key",
    });
  }
};

exports.activateApiKey = async (req, res) => {
  try {
    const result = await apiKeyService.activateApiKey(req.params.uuid);

    res.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error("API Key Controller - activateApiKey error:", error);
    const status = error.status || 500;
    res.status(status).json({
      success: false,
      message: error.message || "Failed to activate API key",
    });
  }
};

exports.deleteApiKey = async (req, res) => {
  try {
    const result = await apiKeyService.deleteApiKey(req.params.uuid);

    res.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error("API Key Controller - deleteApiKey error:", error);
    const status = error.status || 500;
    res.status(status).json({
      success: false,
      message: error.message || "Failed to delete API key",
    });
  }
};

exports.getAvailableRoutes = async (req, res) => {
  try {
    const routes = [];
    const app = req.app;

    // Express 5 uses app.router, Express 4 uses app._router
    const router = app.router || app._router;
    if (!router || !router.stack) {
      return res.json({ success: true, data: [] });
    }

    /**
     * In Express 5, mounted routers no longer expose their mount path
     * on layer.path. The path is captured inside a matcher closure.
     * We probe the matcher with known API prefixes to discover the mount path.
     */
    const extractPrefix = (layer) => {
      if (!layer.matchers || !layer.matchers[0]) return layer.path || "";
      const match = layer.matchers[0];

      // Level-1 prefixes
      const l1 = [
        "api", "uploads", "socket",
      ];
      // Level-2 segments (under /api)
      const l2 = [
        "landing", "auth", "protected", "users", "content", "student",
        "instructor", "admin", "google", "support", "notifications",
        "notification-permissions", "public", "super-admin", "scorm-manifest",
      ];
      // Level-3 segments (under /api/admin, /api/student, etc.)
      const l3 = [
        "courses", "mentorship", "events", "activity", "calendar",
        "announcements", "dashboard", "transcript", "instructor-availability",
        "instructor-profile", "certificates", "achievements", "corporate-info",
        "ai-learning-path", "notifications", "reports", "teams", "users",
        "marketing", "ilt", "batches", "group-projects", "instructors",
        "students", "reminders", "sessions", "profile", "catalog", "settings",
        "api-keys", "schedules", "custom-reports", "bulk-upload", "content",
        "learning-items", "meet", "oauth", "feedback", "uploads",
        "certification", "user-certificates", "external-certificates",
        "batch",
      ];

      // Try deepest first (3 levels), then 2, then 1
      for (const s1 of l1) {
        for (const s2 of l2) {
          for (const s3 of l3) {
            const p = `/${s1}/${s2}/${s3}`;
            const r = match(p);
            if (r && r.path === p) return p;
          }
          const p = `/${s1}/${s2}`;
          const r = match(p);
          if (r && r.path === p) return p;
        }
        const p = `/${s1}`;
        const r = match(p);
        if (r && r.path === p) return p;
      }

      // Fallback: try root
      const root = match("/");
      if (root) return root.path;

      return "";
    };

    router.stack.forEach((layer) => {
      if (layer.route) {
        routes.push({
          path: layer.route.path,
          methods: Object.keys(layer.route.methods),
        });
      } else if (layer.handle && layer.handle.stack) {
        const basePath = extractPrefix(layer);

        layer.handle.stack.forEach((handler) => {
          if (handler.route) {
            routes.push({
              path: basePath + handler.route.path,
              methods: Object.keys(handler.route.methods),
            });
          }
        });
      }
    });

    // Filter to only /api routes, clean up trailing slashes, and deduplicate
    const routeMap = new Map();
    routes
      .filter((r) => r.path.startsWith("/api"))
      .forEach((r) => {
        const cleanPath = r.path.replace(/\/$/, "") || r.path;
        if (routeMap.has(cleanPath)) {
          // Merge methods into existing entry
          const existing = routeMap.get(cleanPath);
          r.methods.forEach((m) => {
            if (!existing.methods.includes(m)) existing.methods.push(m);
          });
        } else {
          routeMap.set(cleanPath, { path: cleanPath, methods: [...r.methods] });
        }
      });

    res.json({
      success: true,
      data: Array.from(routeMap.values()),
    });
  } catch (error) {
    console.error("API Key Controller - getAvailableRoutes error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch available routes",
      error: error.message,
    });
  }
};
