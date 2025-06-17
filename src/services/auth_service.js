const { promisePool } = require('../config/db');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');
const UserDTO = require('../dto/user_dto');

class AuthService {
  // Generate a 6-digit verification code
  generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Hash password
  async hashPassword(password) {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
  }

  // Compare password
  async comparePassword(inputPassword, hashedPassword) {
    return await bcrypt.compare(inputPassword, hashedPassword);
  }

  // Generate JWT token
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

  // Register new user
  async registerUser(email, password, firstName, lastName, roleId) {
    const uuid = uuidv4();
    const verificationCode = this.generateVerificationCode();
    const hashedPassword = await this.hashPassword(password);

    // Start transaction
    const connection = await promisePool.getConnection();
    await connection.beginTransaction();

    try {
      // Insert into users table
      await connection.query(
        'INSERT INTO users (uuid, email, password, role_id, verification_code) VALUES (?, ?, ?, ?, ?)',
        [uuid, email, hashedPassword, roleId, verificationCode]
      );

      // Insert into respective role table based on roleId
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

      // Commit transaction
      await connection.commit();
      connection.release();

      // In a real app, you would send the verification code via email here
      console.log(`Verification code for ${email}: ${verificationCode}`);

      return new UserDTO(uuid, email, roleId, 'inactive');
    } catch (error) {
      // Rollback transaction if any error occurs
      await connection.rollback();
      connection.release();
      throw error;
    }
  }

  // Login user
  async loginUser(email, password) {
    const [rows] = await promisePool.query(
      'SELECT uuid, email, password, role_id, status FROM users WHERE email = ?',
      [email]
    );

    if (rows.length === 0) {
      throw new Error('User not found');
    }

    const user = rows[0];
    const isMatch = await this.comparePassword(password, user.password);

    if (!isMatch) {
      throw new Error('Invalid credentials');
    }

    if (user.status !== 'active') {
      throw new Error('Account not active. Please verify your email.');
    }

    const token = this.generateToken(user);
    
    return {
      user: new UserDTO(user.uuid, user.email, user.role_id, user.status),
      token
    };
  }

  // Verify user
  async verifyUser(email, verificationCode) {
    const [result] = await promisePool.query(
      'UPDATE users SET status = "active", verification_code = NULL WHERE email = ? AND verification_code = ?',
      [email, verificationCode]
    );

    if (result.affectedRows === 0) {
      throw new Error('Invalid verification code or email');
    }

    return true;
  }

  // Forgot password (generate new verification code)
  async forgotPassword(email) {
    const verificationCode = this.generateVerificationCode();
    const [result] = await promisePool.query(
      'UPDATE users SET verification_code = ? WHERE email = ?',
      [verificationCode, email]
    );

    if (result.affectedRows === 0) {
      throw new Error('Email not found');
    }

    // In a real app, you would send the verification code via email here
    console.log(`Password reset code for ${email}: ${verificationCode}`);

    return true;
  }

  // Reset password
  async resetPassword(email, verificationCode, newPassword) {
    const hashedPassword = await this.hashPassword(newPassword);
    const [result] = await promisePool.query(
      'UPDATE users SET password = ?, verification_code = NULL WHERE email = ? AND verification_code = ?',
      [hashedPassword, email, verificationCode]
    );

    if (result.affectedRows === 0) {
      throw new Error('Invalid verification code or email');
    }

    return true;
  }
}

module.exports = new AuthService();