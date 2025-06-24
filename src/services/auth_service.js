const { promisePool } = require('../config/db');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');
const UserDTO = require('../dto/user_dto');
const emailHelper = require('../utils/email_helper');

class AuthService {
  // Hash password
  async hashPassword(password) {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
  }

  // Compare password
  async comparePassword(inputPassword, hashedPassword) {
    return await bcrypt.compare(inputPassword, hashedPassword);
  }

  // Validate password complexity
  validatePasswordComplexity(password) {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (password.length < minLength) {
      throw new Error(`Password must be at least ${minLength} characters long`);
    }
    if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChars) {
      throw new Error('Password must contain uppercase, lowercase, numbers, and special characters');
    }
  }

  // Generate JWT token
  generateToken(user, sessionId) {
    return jwt.sign(
      { 
        uuid: user.uuid,
        email: user.email,
        role_id: user.role_id,
        session_id: sessionId
      },
      jwtConfig.secret,
      { expiresIn: jwtConfig.expiresIn }
    );
  }

  // Register new user
  async registerUser(email, password, firstName, lastName, roleId) {
    this.validatePasswordComplexity(password);

    const uuid = uuidv4();
    const verificationCode = emailHelper.generateVerificationCode();
    const hashedPassword = await this.hashPassword(password);

    const connection = await promisePool.getConnection();
    await connection.beginTransaction();

    try {
      await connection.query(
        'INSERT INTO users (uuid, email, password, role_id, verification_code) VALUES (?, ?, ?, ?, ?)',
        [uuid, email, hashedPassword, roleId, verificationCode]
      );

      let roleTable;
      switch (roleId) {
        case 1: roleTable = 'students'; break;
        case 2: roleTable = 'instructors'; break;
        case 3: roleTable = 'admins'; break;
        case 4: roleTable = 'super_admins'; break;
        default: throw new Error('Invalid role ID');
      }

      await connection.query(
        `INSERT INTO ${roleTable} (user_id, first_name, last_name) VALUES (?, ?, ?)`,
        [uuid, firstName, lastName]
      );

      await connection.commit();
      connection.release();

      await emailHelper.sendVerificationEmail(email, verificationCode);
      await emailHelper.sendWelcomeEmail(email, firstName);

      return new UserDTO(uuid, email, roleId, 'inactive');
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  }

  // Login user
  async loginUser(email, password) {
    const [rows] = await promisePool.query(
      'SELECT u.uuid, u.email, u.password, u.role_id, u.status, r.first_name, r.last_name ' +
      'FROM users u ' +
      'LEFT JOIN students r ON r.user_id = u.uuid WHERE u.role_id = 1 AND u.email = ? ' +
      'UNION ' +
      'SELECT u.uuid, u.email, u.password, u.role_id, u.status, r.first_name, r.last_name ' +
      'FROM users u ' +
      'LEFT JOIN instructors r ON r.user_id = u.uuid WHERE u.role_id = 2 AND u.email = ? ' +
      'UNION ' +
      'SELECT u.uuid, u.email, u.password, u.role_id, u.status, r.first_name, r.last_name ' +
      'FROM users u ' +
      'LEFT JOIN admins r ON r.user_id = u.uuid WHERE u.role_id = 3 AND u.email = ? ' +
      'UNION ' +
      'SELECT u.uuid, u.email, u.password, u.role_id, u.status, r.first_name, r.last_name ' +
      'FROM users u ' +
      'LEFT JOIN super_admins r ON r.user_id = u.uuid WHERE u.role_id = 4 AND u.email = ?',
      [email, email, email, email]
    );

    if (rows.length === 0) throw new Error('User not found');

    const user = rows[0];
    const isMatch = await this.comparePassword(password, user.password);
    if (!isMatch) throw new Error('Invalid credentials');
    if (user.status !== 'active') throw new Error('Account not active. Please verify your email.');

    const sessionId = uuidv4();
    await promisePool.query(
      'UPDATE users SET session_id = ? WHERE uuid = ?',
      [sessionId, user.uuid]
    );

    return {
      user: {
        uuid: user.uuid,
        email: user.email,
        role_id: user.role_id,
        first_name: user.first_name,
        last_name: user.last_name,
        status: user.status
      },
      token: this.generateToken(user, sessionId)
    };
  }

  // Verify user (with auto-login)
  async verifyUser(email, verificationCode) {
    const connection = await promisePool.getConnection();
    await connection.beginTransaction();

    try {
      const [result] = await connection.query(
        `UPDATE users SET status = "active", verification_code = NULL 
        WHERE email = ? AND verification_code = ? 
        AND created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)`,
        [email, verificationCode]
      );

      if (result.affectedRows === 0) {
        throw new Error('Invalid verification code or email');
      }

      // Get complete user data including role-specific info
      const [userRows] = await connection.query(
        `SELECT u.uuid, u.email, u.role_id, r.first_name, r.last_name
        FROM users u
        LEFT JOIN ${this.getRoleTable(user.role_id)} r ON r.user_id = u.uuid
        WHERE u.email = ?`,
        [email]
      );

      if (userRows.length === 0) throw new Error('User not found');

      const user = userRows[0];
      const sessionId = uuidv4();
      
      await connection.query(
        'UPDATE users SET session_id = ? WHERE email = ?',
        [sessionId, email]
      );

      await connection.commit();
      connection.release();

      return {
        token: this.generateToken(user, sessionId),
        user: {
          uuid: user.uuid,
          email: user.email,
          role_id: user.role_id,
          first_name: user.first_name,
          last_name: user.last_name
        }
      };
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  }


  // Forgot password
  async forgotPassword(email) {
    await emailHelper.sendPasswordResetWithBothOptions(email);
    return true;
  }

  async resetPassword(email, verificationCodeOrToken, newPassword) {
    this.validatePasswordComplexity(newPassword);
    const hashedPassword = await this.hashPassword(newPassword);
    const connection = await promisePool.getConnection();
    
    try {
        const [userRows] = await connection.query(
            `SELECT uuid FROM users 
            WHERE email = ? 
            AND (
                (reset_token = ? AND reset_token_expires > NOW())
                OR verification_code = ?
            )`,
            [email, verificationCodeOrToken, verificationCodeOrToken]
        );

        if (userRows.length === 0) {
            throw new Error('Invalid or expired reset token/verification code');
        }

        const userId = userRows[0].uuid;
        const [result] = await connection.query(
            `UPDATE users 
             SET password = ?, 
                 reset_token = NULL, 
                 reset_token_expires = NULL,
                 verification_code = NULL,
                 updated_at = CURRENT_TIMESTAMP
             WHERE uuid = ?`,
            [hashedPassword, userId]
        );

        if (result.affectedRows === 0) {
            throw new Error('Password reset failed');
        }

        return true;
    } finally {
        connection.release();
    }
  }

  // Logout user
  async logoutUser(uuid) {
    const [result] = await promisePool.query(
      'UPDATE users SET session_id = NULL WHERE uuid = ?',
      [uuid]
    );

    if (result.affectedRows === 0) throw new Error('User not found');
    return true;
  }
}

module.exports = new AuthService();
