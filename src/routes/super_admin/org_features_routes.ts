/**
 * Super Admin — Organization Features management routes.
 * Mounted at /api/super-admin/org-features. Super admin only (role_id = 4).
 */

import express from 'express';
import * as orgFeaturesController from '../../controllers/super_admin/org_features_controller';

const { authenticate, authorize } = require('../../middleware/auth_middleware');

const router = express.Router();

router.use(authenticate);
router.use(authorize(4)); // Only Super Admins can manage org feature access

// The full catalog of gateable functionalities (static; org-independent).
router.get('/catalog', orgFeaturesController.getCatalog);

// One org's feature map (catalog annotated with enabled state).
router.get('/:organizationId', orgFeaturesController.getOrgFeatures);

// Apply a batch of ON/OFF changes for an org.
router.put('/:organizationId', orgFeaturesController.updateOrgFeatures);

export = router;
