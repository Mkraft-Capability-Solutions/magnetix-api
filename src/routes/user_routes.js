const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const multer = require("multer");

const userController = require("../controllers/user_controller");
const {
  authenticate,
  authorize,
  checkSelfOrAdmin,
  checkSelfOrSuperAdmin,
} = require("../middleware/auth_middleware");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = "./uploads/users/";

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif/;
    const extname = filetypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = filetypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error("Only image files are allowed (jpeg, jpg, png, gif)"));
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});


// Get own profile
router.get(
  "/me",
  authenticate,
  authorize(1, 2, 3, 4),
  (req, _res, next) => {
    req.params.uuid = req.user.uuid;
    next();
  },
  checkSelfOrAdmin,
  userController.getUser
);

// Get user by UUID
router.get(
  "/:uuid",
  authenticate,
  authorize(1, 2, 3, 4),
  checkSelfOrAdmin,
  userController.getUser
);

// Update user details
router.put(
  "/:uuid/details",
  authenticate,
  authorize(1, 2, 3, 4),
  checkSelfOrAdmin,
  userController.updateUserDetails
);

// Delete user (soft delete)
router.delete(
  "/:uuid",
  authenticate,
  authorize(3, 4),
  userController.deleteUser
);

// Update user password
router.put(
  "/:uuid/password",
  authenticate,
  authorize(1, 2, 3, 4),
  checkSelfOrSuperAdmin,
  userController.updateUserPassword
);

// ✅ Upload profile picture
router.put(
  "/:uuid/profile-picture",
  authenticate,
  authorize(1, 2, 3, 4),
  checkSelfOrSuperAdmin,
  upload.single("profile_picture"),
  userController.updateProfilePicture
);

module.exports = router;
