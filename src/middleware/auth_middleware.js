const jwt = require("jsonwebtoken");
const jwtConfig = require("../config/jwt");
const { promisePool } = require("../config/db");

//  authenticate middleware to verify access token
exports.authenticate = async (req, res, next) => {
  try {
    // 1. Get token from header
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) {
      return res
        .status(401)
        .json({ message: "No token, authorization denied" });
    }

    // 2. Verify token
    const decoded = jwt.verify(token, jwtConfig.accessSecret);

    // 3. Check if user still exists and session matches
    const [rows] = await promisePool.query(
      "SELECT uuid, email, role_id, status, session_id FROM users WHERE uuid = ? AND is_deleted = 0",
      [decoded.uuid]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: "User not found" });
    }

    if (rows[0].session_id !== decoded.session_id) {
      return res
        .status(401)
        .json({ message: "Session expired. Please login again." });
    }

    // 4. Attach user to request
    req.user = rows[0];
    next();
  } catch (error) {
    console.error(error);
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expired" });
    }
    res.status(401).json({ message: "Token is not valid" });
  }
};

// Like `authenticate`, but NEVER rejects. Used on public surfaces (e.g. the
// Knowledge Base viewer) that must stay open to logged-out visitors while still
// identifying a logged-in user's role when a valid token is present. On any
// missing/invalid/expired token it simply proceeds with `req.user` unset.
exports.optionalAuthenticate = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) return next();

    const decoded = jwt.verify(token, jwtConfig.accessSecret);
    const [rows] = await promisePool.query(
      "SELECT uuid, email, role_id, status, session_id FROM users WHERE uuid = ? AND is_deleted = 0",
      [decoded.uuid]
    );

    if (rows.length > 0 && rows[0].session_id === decoded.session_id) {
      req.user = rows[0];
    }
  } catch (error) {
    // Invalid/expired token on a public route — treat as anonymous, don't block.
  }
  next();
};

exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role_id)) {
      return res.status(403).json({
        message: `User role ${req.user.role_id} is not authorized to access this route`,
      });
    }
    next();
  };
};

exports.checkSelfOrAdmin = (req, res, next) => {
  console.log(req.params);
  // Allow if user is updating their own profile
  if (req.user.uuid === req.params.uuid) {
    return next();
  }

  // Allow if user is admin or super admin
  if ([3, 4].includes(req.user.role_id)) {
    return next();
  }

  return res.status(403).json({
    message: "You are not authorized to perform this action",
  });
};

exports.checkSelfOrSuperAdmin = (req, res, next) => {
  // Allow if user is updating their own profile
  if (req.user.uuid === req.params.uuid) {
    return next();
  }

  // Allow only if user is super admin
  if (req.user.role_id === 4) {
    return next();
  }

  return res.status(403).json({
    message: "You are not authorized to perform this action",
  });
};
