const express = require('express');
const rateLimit = require('express-rate-limit');
const { promisePool } = require('../config/db');

const router = express.Router();

// Lightweight rate-limit to prevent log spam from a single client.
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60, // 60 entries / minute / IP is plenty for real bursts
  standardHeaders: true,
  legacyHeaders: false,
});

const clip = (value, max) => {
  if (value === undefined || value === null) return null;
  const s = String(value);
  return s.length > max ? s.slice(0, max) : s;
};

/**
 * POST /api/telemetry/auth-failure
 * No auth required — we must be able to log failures that happen when the
 * caller's credentials are rejected. Writes are advisory; errors never
 * bubble up to the caller (they've got bigger problems already).
 */
router.post('/auth-failure', limiter, async (req, res) => {
  try {
    const b = req.body || {};
    await promisePool.query(
      `INSERT INTO client_error_log
        (reason, http_method, http_url, http_status, server_message,
         user_id, user_email, user_role, current_path, user_agent,
         consecutive_count, extra)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        clip(b.reason || 'auth_403', 64),
        clip(b.method, 10),
        clip(b.url, 500),
        Number.isFinite(Number(b.status)) ? Number(b.status) : null,
        clip(b.serverMessage, 500),
        clip(b.userId, 36),
        clip(b.userEmail, 255),
        clip(b.userRole, 32),
        clip(b.currentPath, 500),
        clip(b.userAgent || req.headers['user-agent'], 500),
        Number.isFinite(Number(b.consecutiveCount)) ? Number(b.consecutiveCount) : null,
        b.extra ? JSON.stringify(b.extra) : null,
      ]
    );
    res.status(204).end();
  } catch (err) {
    // Logging endpoint must never fail loudly — just record the crash
    // server-side and ack the client so it doesn't loop.
    console.error('telemetry/auth-failure insert failed:', err?.message || err);
    res.status(204).end();
  }
});

module.exports = router;
