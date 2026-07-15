/**
 * Org Features controller — HTTP layer for per-org functionality toggles.
 *
 * Super-admin handlers (catalog / get / update) power the management screen.
 * `getMyFeatures` is the consumer endpoint any authenticated user calls to
 * learn which functionalities their own org is allowed (drives menu filtering).
 */

import type { Request, Response, NextFunction } from 'express';
import * as orgFeaturesService from '../../services/super_admin/org_features_service';

const { promisePool } = require('../../config/db');

/** GET /super-admin/org-features/catalog */
export const getCatalog = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.status(200).json({
      success: true,
      message: 'Feature catalog retrieved successfully',
      data: orgFeaturesService.getCatalog(),
    });
  } catch (error) {
    next(error);
  }
};

/** GET /super-admin/org-features/:organizationId */
export const getOrgFeatures = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const organizationId = parseInt(req.params.organizationId, 10);
    if (Number.isNaN(organizationId)) {
      return res.status(400).json({ success: false, message: 'Invalid organization id' });
    }
    const data = await orgFeaturesService.getOrgFeatureMap(organizationId);
    res.status(200).json({
      success: true,
      message: 'Organization features retrieved successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /super-admin/org-features/:organizationId
 * Body: { features: [{ key: string, enabled: boolean }, ...] }
 */
export const updateOrgFeatures = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const organizationId = parseInt(req.params.organizationId, 10);
    if (Number.isNaN(organizationId)) {
      return res.status(400).json({ success: false, message: 'Invalid organization id' });
    }

    const features = (req.body && req.body.features) as orgFeaturesService.FeatureUpdate[];
    if (!Array.isArray(features) || features.length === 0) {
      return res.status(400).json({ success: false, message: 'features array is required' });
    }

    const actorUuid = (req as any).user?.uuid;
    const result = await orgFeaturesService.setOrgFeatures(organizationId, features, actorUuid);
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /org-features/me
 * Returns the allowed feature keys for the calling user's primary org plus the
 * full catalog, so the frontend can both filter menus and (optionally) explain
 * what's disabled. Super admins have no org gate -> everything allowed.
 */
export const getMyFeatures = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ success: false, message: 'Authentication required' });

    // Super admin: not org-gated, return all keys.
    if (user.role_id === 4) {
      return res.status(200).json({
        success: true,
        message: 'Allowed features retrieved successfully',
        data: { allowedFeatures: orgFeaturesService.getCatalog().map((f) => f.key), organizationId: null },
      });
    }

    const [rows] = await promisePool.query(
      `SELECT organization_id FROM user_organizations
        WHERE user_id = ? ORDER BY assigned_at ASC LIMIT 1`,
      [user.uuid]
    );
    const organizationId: number | null = rows.length ? rows[0].organization_id : null;

    const allowedFeatures = organizationId
      ? await orgFeaturesService.getAllowedFeatureKeysForOrg(organizationId)
      : orgFeaturesService.getCatalog().map((f) => f.key); // no org -> opt-out default (all)

    res.status(200).json({
      success: true,
      message: 'Allowed features retrieved successfully',
      data: { allowedFeatures, organizationId },
    });
  } catch (error) {
    next(error);
  }
};
