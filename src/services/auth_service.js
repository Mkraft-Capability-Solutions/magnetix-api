const { promisePool } = require('../config/db');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');
const UserDTO = require('../dto/user_dto');
const emailHelper = require('../utils/email_helper');

class AuthService {
  async hashPassword(password) {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
  }

  async comparePassword(inputPassword, hashedPassword) {
    return await bcrypt.compare(inputPassword, hashedPassword);
  }

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

  generateTokens(user, sessionId) {
    const accessToken = jwt.sign(
      { uuid: user.uuid, email: user.email, role_id: user.role_id, session_id: sessionId },
      jwtConfig.accessSecret,
      { expiresIn: jwtConfig.accessExpiresIn }
    );

    const refreshToken = jwt.sign(
      { uuid: user.uuid, session_id: sessionId },
      jwtConfig.refreshSecret,
      { expiresIn: jwtConfig.refreshExpiresIn }
    );

    const now = Math.floor(Date.now() / 1000);
    const accessTokenExpiry = now + jwt.decode(accessToken).exp;
    const refreshTokenExpiry = now + jwt.decode(refreshToken).exp;

    return { accessToken, refreshToken, accessTokenExpiry, refreshTokenExpiry };
  }

  async refreshAccessToken(refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, jwtConfig.refreshSecret);

      const [result] = await promisePool.query('CALL refresh_session_user(?)', [decoded.uuid]);
      const rows = result[0];

      if (rows.length === 0 || rows[0].session_id !== decoded.session_id) {
        throw new Error('Invalid session');
      }

      const user = rows[0];
      return this.generateTokens(user, user.session_id).accessToken;
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }


  async registerUser(email, password, firstName, lastName, roleId) {
    this.validatePasswordComplexity(password);
    const uuid = uuidv4();
    const verificationCode = emailHelper.generateVerificationCode();
    const hashedPassword = await this.hashPassword(password);

    try {
      await promisePool.query(
        'CALL register_user(?, ?, ?, ?, ?, ?, ?)',
        [uuid, email, hashedPassword, roleId, verificationCode, firstName, lastName]
      );

      await emailHelper.sendVerificationEmail(email, verificationCode);
      return new UserDTO({ uuid, email, role_id: roleId, status: 'inactive' });
    } catch (error) {
      throw error;
    }
  }

  async loginUser(email, password) {
    const [result] = await promisePool.query('CALL login_user(?)', [email]);
    const rows = result[0];

    if (rows.length === 0) throw new Error('User not found');

    const user = rows[0];
    const isMatch = await this.comparePassword(password, user.password);
    if (!isMatch) throw new Error('Invalid credentials');
    if (user.status !== 'active') throw new Error('Account not active. Please verify your email.');

    const sessionId = uuidv4();
    await promisePool.query('UPDATE users SET session_id = ? WHERE uuid = ?', [sessionId, user.uuid]);

    return {
      user: {
        uuid: user.uuid,
        email: user.email,
        role_id: user.role_id,
        first_name: user.first_name,
        last_name: user.last_name,
        dp: user.dp || null,
        status: user.status
      },
      ...this.generateTokens(user, sessionId)
    };
  }

  async verifyUser(email, verificationCode) {
    const connection = await promisePool.getConnection();
    await connection.beginTransaction();

    try {
      const [rows] = await connection.query('CALL verify_user(?, ?)', [email, verificationCode]);
      const result = rows[0];
      if (result.length === 0 || result[0].status !== 'success') {
        throw new Error('Invalid verification code or email');
      }

      const [userRows] = await connection.query(
        `SELECT u.uuid, u.email, u.role_id, u.status,
         r.first_name, r.last_name, r.dp
         FROM users u
         LEFT JOIN (
           SELECT user_id, first_name, last_name, dp FROM students
           UNION SELECT user_id, first_name, last_name, dp FROM instructors
           UNION SELECT user_id, first_name, last_name, dp FROM admins
           UNION SELECT user_id, first_name, last_name, dp FROM super_admins
         ) r ON r.user_id = u.uuid
         WHERE u.email = ?`,
        [email]
      );

      if (userRows.length === 0) throw new Error('User not found');
      const user = userRows[0];

      const sessionId = uuidv4();
      await connection.query('UPDATE users SET session_id = ? WHERE email = ?', [sessionId, email]);

      await connection.commit();
      connection.release();

      await emailHelper.sendWelcomeEmail(email, user.first_name);

      return {
        ...this.generateTokens(user, sessionId),
        user: {
          uuid: user.uuid,
          email: user.email,
          role_id: user.role_id,
          first_name: user.first_name,
          last_name: user.last_name,
          dp: user.dp || null,
          status: user.status
        }
      };
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  }

  getRoleTable(roleId) {
    switch(roleId) {
      case 1: return 'students';
      case 2: return 'instructors';
      case 3: return 'admins';
      case 4: return 'super_admins';
      default: throw new Error('Invalid role ID');
    }
  }

  async forgotPassword(email) {
    await emailHelper.sendPasswordResetWithBothOptions(email);
    return true;
  }

  async resendVerificationCode(email) {
    const verificationCode = emailHelper.generateVerificationCode();

    await promisePool.query('CALL resend_verification_code(?, ?)', [email, verificationCode]);
    await emailHelper.sendVerificationEmail(email, verificationCode);
    return true;
  }

  async resetPassword(email, verificationCode, newPassword) {
    this.validatePasswordComplexity(newPassword);
    const hashedPassword = await this.hashPassword(newPassword);

    try {
      // Get a connection from the pool
      const connection = await promisePool.getConnection();
      
      try {
        // Execute the stored procedure
        const [result] = await connection.query(
          'CALL reset_password(?, ?, ?)', 
          [email, verificationCode, hashedPassword]
        );
        
        // Release the connection
        connection.release();
        
        // Check if the operation was successful
        if (result.affectedRows === 0) {
          throw new Error('Password reset failed - no rows affected');
        }
        
        return true;
      } catch (error) {
        // Ensure connection is released even if error occurs
        connection.release();
        throw error;
      }
    } catch (error) {
      throw error;
    }
  }

  async logoutUser(uuid) {
    await promisePool.query('CALL logout_user(?)', [uuid]);
    return true;
  }
}

module.exports = new AuthService();
