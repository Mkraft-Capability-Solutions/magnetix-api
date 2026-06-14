const { promisePool } = require("../config/db");
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const jwt = require("jsonwebtoken");
const jwtConfig = require("../config/jwt");
const UserDTO = require("../dto/user_dto");
const emailHelper = require("../utils/email_helper");

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
      throw new Error(
        "Password must contain uppercase, lowercase, numbers, and special characters"
      );
    }
  }

  generateTokens(user, sessionId) {
    // build payloads
    const accessPayload = {
      uuid: user.uuid,
      email: user.email,
      role_id: user.role_id,
      first_name: user.first_name,
      last_name: user.last_name,
      dp: user.dp || null,
      instance: user.instance,
      session_id: sessionId,
    };

    const refreshPayload = {
      uuid: user.uuid,
      session_id: sessionId,
    };

    // sign tokens
    const accessToken = jwt.sign(accessPayload, jwtConfig.accessSecret, {
      expiresIn: jwtConfig.accessExpiresIn,
    });

    const refreshToken = jwt.sign(refreshPayload, jwtConfig.refreshSecret, {
      expiresIn: jwtConfig.refreshExpiresIn,
    });

    // now (UNIX seconds)
    const now = Math.floor(Date.now() / 1000);

    // decode to read the `exp` claim (which is already an absolute UNIX timestamp, in seconds)
    const decodedAccess = jwt.decode(accessToken) || {};
    const decodedRefresh = jwt.decode(refreshToken) || {};

    // expiry timestamps as UNIX SECONDS (per JWT spec) used for relative-time math
    const accessTokenExpirySeconds = decodedAccess.exp || now;
    const refreshTokenExpirySeconds = decodedRefresh.exp || now;

    // time until expiry (seconds from now)
    const accessTokenExpiresIn = Math.max(0, accessTokenExpirySeconds - now);
    const refreshTokenExpiresIn = Math.max(0, refreshTokenExpirySeconds - now);

    return {
      accessToken,
      refreshToken,
      // absolute expiry as UNIX MILLISECONDS — frontend compares against Date.now()
      accessTokenExpiry: accessTokenExpirySeconds * 1000,
      refreshTokenExpiry: refreshTokenExpirySeconds * 1000,
      // convenience: seconds until expiry
      accessTokenExpiresIn,
      refreshTokenExpiresIn,
    };
  }

  async refreshAccessToken(refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, jwtConfig.refreshSecret);

      const [result] = await promisePool.query("CALL refresh_session_user(?)", [
        decoded.uuid,
      ]);
      const rows = result[0];

      if (rows.length === 0 || rows[0].session_id !== decoded.session_id) {
        throw new Error("Invalid session");
      }

      const user = rows[0];
      // Return both the new token and its absolute expiry (ms) so the frontend
      // can schedule the next proactive refresh against the real TTL instead of
      // assuming a hardcoded 1-hour window.
      const { accessToken, accessTokenExpiry } = this.generateTokens(user, user.session_id);
      return { accessToken, accessTokenExpiry };
    } catch (error) {
      console.log(error);
      throw new Error("Invalid refresh token: " + error.message);
    }
  }

  async registerUser(email, password, firstName, lastName, roleId) {
    this.validatePasswordComplexity(password);
    const uuid = uuidv4();
    const verificationCode = emailHelper.generateVerificationCode();
    const hashedPassword = await this.hashPassword(password);

    try {
      await promisePool.query("CALL register_user(?, ?, ?, ?, ?, ?, ?)", [
        uuid,
        email,
        hashedPassword,
        roleId,
        verificationCode,
        firstName,
        lastName,
      ]);

      await emailHelper.sendVerificationEmail(email, verificationCode);
      return new UserDTO({ uuid, email, role_id: roleId, status: "inactive" });
    } catch (error) {
      throw error;
    }
  }

  async loginUser(email, password) {
    // Call stored procedure to get user details
    const [resultSets] = await promisePool.query("CALL login_user(?)", [email]);
    const rows = resultSets[0];

    if (rows.length === 0) throw new Error("User not found");

    const user = rows[0];

    // Compare password
    const isMatch = await this.comparePassword(password, user.password);
    if (!isMatch) throw new Error("Invalid credentials");

    if (user.status !== "active")
      throw new Error("Account not active. Please verify your email.");

    // Generate new session ID
    const sessionId = uuidv4();
    await promisePool.query("UPDATE users SET session_id = ? WHERE uuid = ?", [
      sessionId,
      user.uuid,
    ]);

    // Log user login activity for streak calculation
    try {
      await promisePool.query(
        `INSERT INTO user_login_log (user_uuid, login_time)
         VALUES (?, NOW())`,
        [user.uuid]
      );
    } catch (loginLogError) {
      // Don't fail login if logging fails, just log the error
      console.error('Failed to log user login:', loginLogError);
    }

    // Look up teams this user manages so the frontend can show the Manager UI.
    // We include teams managed directly AND teams managed by anyone in their
    // downline (via users.reports_to_uuid) — so a senior manager sees their
    // junior managers' teams too.
    let managedTeamIds = [];
    let hasReportees = false;
    try {
      const {
        getManagedTeamIdsForUser,
        userHasReportees
      } = require('../utils/manager_hierarchy');
      const [mIds, rep] = await Promise.all([
        getManagedTeamIdsForUser(user.uuid),
        userHasReportees(user.uuid)
      ]);
      managedTeamIds = mIds;
      hasReportees = rep;
    } catch (mgrErr) {
      console.error('Failed to load manager hierarchy info:', mgrErr);
    }

    // Look up the user's organization(s) so the frontend can show "Org: X"
    // in the header without a second round-trip after login.
    let organizations = [];
    try {
      const [orgRows] = await promisePool.query(
        `SELECT o.id, o.name, o.is_active, uo.assigned_at
           FROM user_organizations uo
           INNER JOIN organizations o ON uo.organization_id = o.id
           WHERE uo.user_id = ? AND o.is_active = 1
           ORDER BY uo.assigned_at ASC`,
        [user.uuid]
      );
      organizations = orgRows.map((r) => ({
        id: r.id,
        name: r.name,
        isActive: r.is_active === 1
      }));
    } catch (orgErr) {
      console.error('Failed to load user organizations:', orgErr);
    }
    // The "primary" org is the one we display prominently. Today's data model
    // typically has one org per user; if there are multiple, pick the oldest
    // assignment (most stable over time).
    const primaryOrganization = organizations[0] || null;

    // Return user and tokens
    return {
      user: {
        uuid: user.uuid,
        email: user.email,
        role_id: user.role_id,
        first_name: user.first_name,
        last_name: user.last_name,
        dp: user.dp || null,
        status: user.status,
        instance: user.instance,
        managedTeamIds,
        hasReportees,
        organizations,
        primaryOrganization,
      },
      ...this.generateTokens(user, sessionId),
    };
  }

  async verifyUser(email, verificationCode) {
    const connection = await promisePool.getConnection();
    await connection.beginTransaction();

    try {
      // Call updated stored procedure which returns user info on success
      const [rows] = await connection.query("CALL verify_user(?, ?)", [
        email,
        verificationCode,
      ]);
      const userRows = rows[0];

      // If verification failed
      if (userRows.length === 0 || userRows[0].status === "failure") {
        throw new Error("Invalid verification code or email");
      }

      // Extract user data
      const user = userRows[0];

      // Generate new session ID and update the user
      const sessionId = uuidv4();
      await connection.query(
        "UPDATE users SET session_id = ? WHERE email = ?",
        [sessionId, email]
      );

      // Commit and release DB connection
      await connection.commit();
      connection.release();

      // Send welcome email
      await emailHelper.sendWelcomeEmail(email, user.first_name);

      // ✅ Return tokens + user info
      return {
        ...this.generateTokens(user, sessionId),
        user: {
          uuid: user.uuid,
          email: user.email,
          role_id: user.role_id,
          first_name: user.first_name,
          last_name: user.last_name,
          dp: user.dp || null,
          status: user.status,
          instance: user.instance,
        },
      };
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  }

  getRoleTable(roleId) {
    switch (roleId) {
      case 1:
        return "students";
      case 2:
        return "instructors";
      case 3:
        return "admins";
      case 4:
        return "super_admins";
      default:
        throw new Error("Invalid role ID");
    }
  }

  async forgotPassword(email) {
    await emailHelper.sendPasswordResetWithBothOptions(email);
    return true;
  }

  async resendVerificationCode(email) {
    const verificationCode = emailHelper.generateVerificationCode();

    await promisePool.query("CALL resend_verification_code(?, ?)", [
      email,
      verificationCode,
    ]);
    await emailHelper.sendVerificationEmail(email, verificationCode);
    return true;
  }

  async resetPassword(email, verificationCode, newPassword) {
    this.validatePasswordComplexity(newPassword);
    const hashedPassword = await this.hashPassword(newPassword);

    const connection = await promisePool.getConnection();
    try {
      const [resultSets] = await connection.query(
        "CALL reset_password(?, ?, ?)",
        [email, verificationCode, hashedPassword]
      );

      console.log("Stored procedure resultSets:", resultSets);

      connection.release();

      const result = resultSets?.[0]?.[0]; // Fixed here
      if (!result || result.status !== "success") {
        throw new Error("Password reset failed");
      }

      return true;
    } catch (error) {
      connection.release();
      console.error("Error in resetPassword:", error);
      throw error;
    }
  }

  async logoutUser(uuid) {
    await promisePool.query("CALL logout_user(?)", [uuid]);
    return true;
  }
}

module.exports = new AuthService();
