const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');
const { promisePool } = require('../config/db');

exports.authenticate = async (req, res, next) => {
  try {
    // 1. Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    // 2. Verify token
    const decoded = jwt.verify(token, jwtConfig.secret);

    // 3. Check if user still exists
    const [rows] = await promisePool.query(
      'SELECT uuid, email, role_id, status FROM users WHERE uuid = ?',
      [decoded.uuid]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: 'User not found' });
    }

    // 4. Attach user to request
    req.user = rows[0];
    next();
  } catch (error) {
    console.error(error);
    res.status(401).json({ message: 'Token is not valid' });
  }
};

exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role_id)) {
      return res.status(403).json({ 
        message: `User role ${req.user.role_id} is not authorized to access this route` 
      });
    }
    next();
  };
};