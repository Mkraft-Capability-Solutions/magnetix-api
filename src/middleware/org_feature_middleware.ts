/**
 * Org-level feature enforcement — companion to `requirePermission` (role-level)
 * and `authorize` (role gate).
 *
 * `requireOrgFeature(key)` blocks a route when the caller's organization has
 * that functionality switched OFF by a Super Admin. It is the server-side half
 * of the per-org feature toggles; the frontend hides the matching menu item,
 * this stops anyone reaching the feature by URL or direct API call.
 *
 * Guarantees mirroring the RBAC middleware:
 *   1. Super admin (role_id === 4) ALWAYS bypasses — they are the ones managing
 *      these toggles and typically belong to no single org.
 *   2. OPT-OUT default: a feature is only blocked when an explicit override row
 *      says is_enabled = 0. So unconfigured orgs (and users with no org) keep
 *      full access — rolling this out can never silently lock anyone out.
 *   3. Per-org disabled-set is cached with a short TTL (in the service); the
 *      management API busts the cache on every change.
 *
 * Must run AFTER `authenticate` (reads `req.user`). For mount-level use where
 * `authenticate` hasn't run yet, use `featureGate(key)` which chains both.
 */

import type { Request, Response, NextFunction } from 'express';
import { authenticate } from './auth_middleware';
import { getDisabledFeatureKeysCached } from '../services/super_admin/org_features_service';

const ROLE_SUPER_ADMIN = 4;

// Resolve a user's organization id. req.user (from JWT) carries no org, so we
// look it up from user_organizations. Cached briefly to keep the request path
// cheap; org membership changes rarely.
const { promisePool } = require('../config/db');
const ORG_CACHE_TTL_MS = 60 * 1000;
const _orgCache = new Map<string, { orgId: number | null; exp: number }>();

async function getPrimaryOrgIdForUser(userUuid: string): Promise<number | null> {
  const now = Date.now();
  const hit = _orgCache.get(userUuid);
  if (hit && hit.exp > now) return hit.orgId;

  const [rows] = await promisePool.query(
    `SELECT organization_id FROM user_organizations
      WHERE user_id = ? ORDER BY assigned_at ASC LIMIT 1`,
    [userUuid]
  );
  const orgId = (rows as any[]).length ? (rows as any[])[0].organization_id : null;
  _orgCache.set(userUuid, { orgId, exp: now + ORG_CACHE_TTL_MS });
  return orgId;
}

/** Drop a user's cached org (call when membership changes). */
export function bustUserOrgCache(userUuid?: string): void {
  if (!userUuid) _orgCache.clear();
  else _orgCache.delete(userUuid);
}

/**
 * Middleware factory: block the route if the caller's org has `featureKey`
 * disabled.
 */
export function requireOrgFeature(featureKey: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      // Super admin is never gated.
      if (user.role_id === ROLE_SUPER_ADMIN) return next();

      const orgId = await getPrimaryOrgIdForUser(user.uuid);
      // No org -> nothing to restrict against (opt-out default).
      if (!orgId) return next();

      const disabled = await getDisabledFeatureKeysCached(orgId);
      if (disabled.has(featureKey)) {
        return res.status(403).json({
          message: 'This functionality is not enabled for your organization.',
          feature: featureKey,
          code: 'FEATURE_DISABLED',
        });
      }
      return next();
    } catch (error) {
      console.error('requireOrgFeature error:', error);
      return res.status(500).json({ message: 'Feature check failed' });
    }
  };
}

/**
 * Convenience for mounting at the app level (where `authenticate` has not run
 * yet): returns [authenticate, requireOrgFeature(key)]. Express accepts the
 * array as a middleware chain. authenticate also runs inside the mounted
 * router; the double run is harmless (idempotent token+session check).
 */
export function featureGate(featureKey: string) {
  return [authenticate, requireOrgFeature(featureKey)];
}
