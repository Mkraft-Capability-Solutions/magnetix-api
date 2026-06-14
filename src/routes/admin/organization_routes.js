const express = require('express');
const router = express.Router();
const { promisePool } = require('../../config/db');
const { authenticate, authorize } = require('../../middleware/auth_middleware');

router.use(authenticate);
router.use(authorize(3, 4));

router.get('/', async (req, res) => {
  try {
    const isSuper = req.user.role_id === 4;
    const sql = isSuper
      ? `SELECT id, name FROM organizations WHERE is_active = 1 ORDER BY name`
      : `SELECT o.id, o.name
           FROM organizations o
           INNER JOIN user_organizations uo ON uo.organization_id = o.id
           WHERE uo.user_id = ? AND o.is_active = 1
           ORDER BY o.name`;
    const params = isSuper ? [] : [req.user.uuid];
    const [rows] = await promisePool.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Admin organizations list error:', error);
    res.status(500).json({ success: false, message: 'Failed to load organizations' });
  }
});

module.exports = router;
