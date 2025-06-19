const { promisePool } = require('../config/db');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');
const UserDTO = require('../dto/user_dto');
const redis = require('../config/redis');
const AppError = require('../utils/appError');
const { sendEmail } = require('../utils/email');

class AuthService {
  constructor() {
    this.SALT_ROUNDS = 12;
    this.VERIFICATION_CODE_EXPIRY = 10 * 60; // 10 minutes in seconds
  }

  generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async hashPassword(password) {
    return await bcrypt.hash(password, this.SALT_ROUNDS);
  }

  async comparePassword(inputPassword, hashedPassword) {
    return await bcrypt.compare(inputPassword, hashedPassword);
  }

  generateToken(user) {
    return jwt.sign(
      { 
        uuid: user.uuid,
        email: user.email,
        role_id: user.role_id 
      },
      jwtConfig.secret,
      { expiresIn: jwtConfig.expiresIn }
    );
  }

  async registerUser(email, password, firstName, lastName, roleId) {
    const uuid = uuidv4();
    const verificationCode = this.generateVerificationCode();
    const hashedPassword = await this.hashPassword(password);

    const connection = await promisePool.getConnection();
    await connection.beginTransaction();

    try {
      // Check if email already exists
      const [existing] = await connection.query(
        'SELECT email FROM users WHERE email = ?',
        [email]
      );
      
      if (existing.length > 0) {
        throw new AppError('Email already in use', 400);
      }

      // Insert into users table
      await connection.query(
        `INSERT INTO users 
        (uuid, email, password, role_id, verification_code) 
        VALUES (?, ?, ?, ?, ?)`,
        [uuid, email, hashedPassword, roleId, verificationCode]
      );

      // Insert into role-specific table
      const roleTable = this.getRoleTable(roleId);
      await connection.query(
        `INSERT INTO ${roleTable} 
        (user_id, first_name, last_name) 
        VALUES (?, ?, ?)`,
        [uuid, firstName, lastName]
      );

      await connection.commit();
      connection.release();

      // Cache verification code with expiry
      await redis.set(
        `verification:${email}`,
        verificationCode,
        'EX',
        this.VERIFICATION_CODE_EXPIRY
      );

      // Send verification email (in production)
      if (process.env.NODE_ENV === 'production') {
        await sendEmail({
          email,
          subject: 'Verify your account',
          message: `Your verification code is ${verificationCode}`
        });
      } else {
        console.log(`Verification code for ${email}: ${verificationCode}`);
      }

      return new UserDTO(uuid, email, roleId, 'inactive');
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  }

  getRoleTable(roleId) {
    const tables = {
      1: 'students',
      2: 'instructors',
      3: 'admins',
      4: 'super_admins'
    };
    if (!tables[roleId]) {
      throw new AppError('Invalid role ID', 400);
    }
    return tables[roleId];
  }

  async loginUser(email, password) {
    const [rows] = await promisePool.query(
      `SELECT uuid, email, password, role_id, status 
       FROM users 
       WHERE email = ? AND is_deleted = 0`,
      [email]
    );

    if (rows.length === 0) {
      throw new AppError('Incorrect email or password', 401);
    }

    const user = rows[0];
    const isMatch = await this.comparePassword(password, user.password);

    if (!isMatch) {
      throw new AppError('Incorrect email or password', 401);
    }

    if (user.status !== 'active') {
      throw new AppError('Account not active. Please verify your email.', 403);
    }

    const token = this.generateToken(user);
    
    return {
      user: new UserDTO(user.uuid, user.email, user.role_id, user.status),
      token
    };
  }

  async verifyUser(email, verificationCode) {
    const cachedCode = await redis.get(`verification:${email}`);
    
    if (cachedCode !== verificationCode) {
      throw new AppError('Invalid verification code', 400);
    }

    const [result] = await promisePool.query(
      `UPDATE users 
       SET status = 'active', verification_code = NULL 
       WHERE email = ? AND verification_code = ?`,
      [email, verificationCode]
    );

    if (result.affectedRows === 0) {
      throw new AppError('Invalid verification code or email', 400);
    }

    // Clear verification code from cache
    await redis.del(`verification:${email}`);

    return true;
  }

  async forgotPassword(email) {
    const verificationCode = this.generateVerificationCode();
    
    const [result] = await promisePool.query(
      `UPDATE users 
       SET verification_code = ? 
       WHERE email = ? AND is_deleted = 0`,
      [verificationCode, email]
    );

    if (result.affectedRows === 0) {
      throw new AppError('Email not found', 404);
    }

    // Cache verification code with expiry
    await redis.set(
      `password_reset:${email}`,
      verificationCode,
      'EX',
      this.VERIFICATION_CODE_EXPIRY
    );

    // Send password reset email (in production)
    if (process.env.NODE_ENV === 'production') {
      await sendEmail({
        email,
        subject: 'Password Reset Code',
        message: `Your password reset code is ${verificationCode}`
      });
    } else {
      console.log(`Password reset code for ${email}: ${verificationCode}`);
    }

    return true;
  }

  async resetPassword(email, verificationCode, newPassword) {
    const cachedCode = await redis.get(`password_reset:${email}`);
    
    if (cachedCode !== verificationCode) {
      throw new AppError('Invalid verification code', 400);
    }

    const hashedPassword = await this.hashPassword(newPassword);
    const [result] = await promisePool.query(
      `UPDATE users 
       SET password = ?, verification_code = NULL 
       WHERE email = ? AND verification_code = ?`,
      [hashedPassword, email, verificationCode]
    );

    if (result.affectedRows === 0) {
      throw new AppError('Invalid verification code or email', 400);
    }

    // Clear password reset code from cache
    await redis.del(`password_reset:${email}`);

    return true;
  }
}

module.exports = new AuthService();