const express = require('express');
const router = express.Router();
const userController = require('../controllers/user_controller');
const { authenticate, authorize, checkSelfOrAdmin, checkSelfOrSuperAdmin } = require('../middleware/auth_middleware');
const multer = require('multer');
const path = require('path');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './uploads/user_images/');
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (jpeg, jpg, png, gif)'));
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Get user details
router.get('/:uuid', 
  authenticate, 
  authorize(1, 2, 3, 4), // All roles can access
  checkSelfOrAdmin, // But can only view self or be admin
  userController.getUser
);

// Update user details
router.put('/:uuid/details', 
  authenticate,
  authorize(1, 2, 3, 4), // All roles can access
  checkSelfOrAdmin, // But can only update self or be admin
  userController.updateUserDetails
);

// Delete user (soft delete)
router.delete('/:uuid', 
  authenticate,
  authorize(3, 4), // Only admin and super admin can delete
  userController.deleteUser
);

// Update user password
router.put('/:uuid/password', 
  authenticate,
  authorize(1, 2, 3, 4), // All roles can access
  checkSelfOrSuperAdmin, // But can only update self or be super admin
  userController.updateUserPassword
);

// Update profile picture
router.put('/:uuid/profile-picture', 
  authenticate,
  authorize(1, 2, 3, 4), // All roles can access
  checkSelfOrSuperAdmin, // But can only update self or be super admin
  upload.single('profile_picture'),
  userController.updateProfilePicture
);

module.exports = router;