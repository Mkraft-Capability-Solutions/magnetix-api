/**
 * Org Features service — resolves and mutates which functionalities an
 * organization is allowed to use.
 *
 * Storage model (OPT-OUT, see config/org_features_catalog): the
 * `organization_features` table stores ONLY overrides. A feature is considered
 * DISABLED for an org iff a row exists with is_enabled = 0. Absence of a row,
 * or is_enabled = 1, means enabled. New orgs therefore have everything on.
 */

import { promisePool } from '../../config/db';
import { writeAudit } from '../../utils/audit_log';
import {
  ORG_FEATURES,
  ALL_FEATURE_KEYS,
  isValidFeatureKey,
  OrgFeature,
} from '../../config/org_features_catalog';

export interface FeatureUpdate {
  key: string;
  enabled: boolean;
}

export interface OrgFeatureRow extends OrgFeature {
  enabled: boolean;
}

/** The full catalog (no org context). */
export const getCatalog = (): ReadonlyArray<OrgFeature> => ORG_FEATURES;

/**
 * Keys explicitly turned OFF for an org. Empty set => org has everything.
 */
export async function getDisabledFeatureKeysForOrg(organizationId: number): Promise<Set<string>> {
  if (!organizationId) return new Set();
  const [rows] = await promisePool.query(
    `SELECT feature_key FROM organization_features
      WHERE organization_id = ? AND is_enabled = 0`,
    [organizationId]
  );
  return new Set((rows as any[]).map((r) => r.feature_key));
}

/**
 * The list of feature keys an org is allowed to use (catalog minus disabled).
 * This is what the frontend filters menus against.
 */
export async function getAllowedFeatureKeysForOrg(organizationId: number): Promise<string[]> {
  const disabled = await getDisabledFeatureKeysForOrg(organizationId);
  if (disabled.size === 0) return [...ALL_FEATURE_KEYS];
  return ALL_FEATURE_KEYS.filter((k) => !disabled.has(k));
}

/**
 * Full catalog annotated with each feature's enabled state for one org —
 * powers the Super Admin management screen.
 */
export async function getOrgFeatureMap(organizationId: number): Promise<OrgFeatureRow[]> {
  const disabled = await getDisabledFeatureKeysForOrg(organizationId);
  return ORG_FEATURES.map((f) => ({ ...f, enabled: !disabled.has(f.key) }));
}

/**
 * Apply a batch of ON/OFF changes for an org. Upserts one row per feature:
 *   enabled === false -> persist an override row (is_enabled = 0)
 *   enabled === true  -> set is_enabled = 1 (back to default-allowed)
 *
 * Unknown feature keys are ignored (defensive against stale clients). Returns
 * the count actually applied. Runs in a transaction so a batch is atomic.
 */
export async function setOrgFeatures(
  organizationId: number,
  updates: FeatureUpdate[],
  actorUuid: string
): Promise<{ success: boolean; message: string; applied: number }> {
  // Validate org exists.
  const [orgRows] = await promisePool.query(
    'SELECT id FROM organizations WHERE id = ?',
    [organizationId]
  );
  if ((orgRows as any[]).length === 0) {
    return { success: false, message: 'Organization not found', applied: 0 };
  }

  const valid = (updates || []).filter((u) => u && isValidFeatureKey(u.key));
  if (valid.length === 0) {
    return { success: false, message: 'No valid feature updates supplied', applied: 0 };
  }

  const connection = await promisePool.getConnection();
  try {
    await connection.beginTransaction();
    for (const u of valid) {
      await connection.query(
        `INSERT INTO organization_features (organization_id, feature_key, is_enabled, updated_by)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE is_enabled = VALUES(is_enabled), updated_by = VALUES(updated_by)`,
        [organizationId, u.key, u.enabled ? 1 : 0, actorUuid || null]
      );
    }
    await connection.commit();
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }

  // Invalidate the enforcement cache so changes take effect promptly.
  bustOrgFeatureCacheForOrg(organizationId);

  // Best-effort audit trail (shares the generic permission_audit_log writer).
  await writeAudit({
    actorUuid,
    action: 'org.features.update',
    targetType: 'organization',
    targetId: organizationId,
    detail: { updates: valid },
  });

  return { success: true, message: 'Organization features updated', applied: valid.length };
}

// ---- enforcement cache (shared with the middleware) ----
// org_id -> { disabled: Set<string>, exp: number }
const _cache = new Map<number, { disabled: Set<string>; exp: number }>();
const CACHE_TTL_MS = 60 * 1000;

/** Cached disabled-key lookup used by the request-path middleware. */
export async function getDisabledFeatureKeysCached(organizationId: number): Promise<Set<string>> {
  const now = Date.now();
  const hit = _cache.get(organizationId);
  if (hit && hit.exp > now) return hit.disabled;
  const disabled = await getDisabledFeatureKeysForOrg(organizationId);
  _cache.set(organizationId, { disabled, exp: now + CACHE_TTL_MS });
  return disabled;
}

export function bustOrgFeatureCacheForOrg(organizationId?: number): void {
  if (organizationId === undefined || organizationId === null) _cache.clear();
  else _cache.delete(organizationId);
}
