const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');
const { promisePool } = require('../config/db');
const redis = require('../config/redis');
const AppError = require('../utils/appError');

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX_REQUESTS = 100;

exports.authenticate = async (req, res, next) => {
  try {
    // 1) Get token from header
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(
        new AppError('You are not logged in! Please log in to get access.', 401)
      );
    }

    // 2) Check if token is blacklisted
    const isBlacklisted = await redis.get(`token:blacklist:${token}`);
    if (isBlacklisted) {
      return next(new AppError('Token revoked. Please log in again.', 401));
    }

    // 3) Verify token
    const decoded = jwt.verify(token, jwtConfig.secret);

    // 4) Check if user still exists
    const cachedUser = await redis.get(`user:auth:${decoded.uuid}`);
    if (cachedUser) {
      req.user = JSON.parse(cachedUser);
      return next();
    }

    // 5) Database fallback
    const [rows] = await promisePool.query(
      'SELECT uuid, email, role_id, status FROM users WHERE uuid = ? AND is_deleted = 0',
      [decoded.uuid]
    );

    if (rows.length === 0) {
      return next(
        new AppError('The user belonging to this token no longer exists.', 401)
      );
    }

    req.user = rows[0];
    
    // 6) Cache user data
    await redis.set(
      `user:auth:${decoded.uuid}`,
      JSON.stringify(req.user),
      'EX',
      jwtConfig.expiresIn
    );

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(new AppError('Your token has expired! Please log in again.', 401));
    }
    if (err.name === 'JsonWebTokenError') {
      return next(new AppError('Invalid token. Please log in again!', 401));
    }
    next(err);
  }
};

exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role_id)) {
      return next(
        new AppError(
          `Role ${req.user.role_id} is not authorized to access this route`,
          403
        )
      );
    }
    next();
  };
};

exports.rateLimit = (windowMs = RATE_LIMIT_WINDOW_MS, max = RATE_LIMIT_MAX_REQUESTS) => {
  return async (req, res, next) => {
    try {
      const key = `rate_limit:${req.ip}:${req.path}`;
      const current = await redis.incr(key);
      
      if (current === 1) {
        await redis.expire(key, windowMs / 1000);
      }
      
      if (current > max) {
        return next(
          new AppError(
            'Too many requests from this IP, please try again later',
            429
          )
        );
      }
      
      next();
    } catch (err) {
      console.error('Redis rate limit error:', err);
      next(); // Skip rate limiting if Redis fails
    }
  };
};

// Custom error class
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}