/**
 * Consumer route for per-org feature access.
 * Mounted at /api/org-features. Any authenticated user can read the set of
 * functionalities their own organization is allowed — used by the frontend to
 * filter navigation. No role gate (every role needs to know its own allowances).
 */

import express from 'express';
import * as orgFeaturesController from '../controllers/super_admin/org_features_controller';

const { authenticate } = require('../middleware/auth_middleware');

const router = express.Router();

router.use(authenticate);

router.get('/me', orgFeaturesController.getMyFeatures);

export = router;
