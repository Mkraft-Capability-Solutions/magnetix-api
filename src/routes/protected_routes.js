const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth_middleware');

// Route accessible to any authenticated user
router.get('/user-dashboard', authenticate, (req, res) => {
  res.json({ 
    message: 'Welcome to your dashboard',
    user: req.user 
  });
});

// Route only accessible to students (role_id = 1)
router.get('/student-only', authenticate, authorize(1), (req, res) => {
  res.json({ 
    message: 'Welcome student!',
    user: req.user 
  });
});

// Route only accessible to instructors (role_id = 2)
router.get('/instructor-only', authenticate, authorize(2), (req, res) => {
  res.json({ 
    message: 'Welcome instructor!',
    user: req.user 
  });
});

// Route accessible to both admins (3) and super_admins (4)
router.get('/admin-portal', authenticate, authorize(3, 4), (req, res) => {
  res.json({ 
    message: 'Welcome to admin portal',
    user: req.user 
  });
});

module.exports = router;
