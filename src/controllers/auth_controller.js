const authService = require("../services/auth_service");
const UserDTO = require("../dto/user_dto");
const Joi = require("joi");
const cookieParser = require("cookie-parser");

// Validation schemas
const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  firstName: Joi.string().required(),
  lastName: Joi.string().required(),
  roleId: Joi.number().integer().min(1).max(4).required(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const verifySchema = Joi.object({
  email: Joi.string().email().required(),
  verificationCode: Joi.string().length(6).required(),
});

const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required(),
});

const resetPasswordSchema = Joi.object({
  email: Joi.string().email().required(),
  verificationCode: Joi.string().optional(),
  verificationCodeOrToken: Joi.string().optional(),
  newPassword: Joi.string().min(8).required(),
}).or("verificationCode", "verificationCodeOrToken");

const resendVerificationSchema = Joi.object({
  email: Joi.string().email().required(),
});

exports.refreshToken = async (req, res, next) => {
  try {
    console.log("Refreshing token...");
    // Get refresh token from cookies
    const refreshToken = req.body?.refreshToken;
    console.log(req.params);
    console.log(req.body);
    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: "No refresh token provided",
      });
    }

    const accessToken = await authService.refreshAccessToken(refreshToken);

    res.json({
      success: true,
      accessToken,
    });
  } catch (error) {
    // Clear the invalid refresh token cookie
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
    });

    next(error);
  }
};

exports.register = async (req, res, next) => {
  try {
    const { error } = registerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const { email, password, firstName, lastName, roleId } = req.body;
    const user = await authService.registerUser(
      email,
      password,
      firstName,
      lastName,
      roleId
    );

    res.status(201).json({
      success: true,
      message:
        "User registered successfully. Please check your email for verification.",
      user,
    });
  } catch (error) {
    next(error);
  }
};

// In the login function
exports.login = async (req, res, next) => {
  try {
    const { error } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const { email, password } = req.body;
    const {
      user,
      accessToken,
      refreshToken,
      accessTokenExpiry,
      refreshTokenExpiry,
    } = await authService.loginUser(email, password);

    const response = {
      success: true,
      message: "Login successful",
      accessToken,
      accessTokenExpiry,
      refreshToken:
        process.env.NODE_ENV === "development" ? refreshToken : undefined,
      refreshTokenExpiry:
        process.env.NODE_ENV === "development" ? refreshTokenExpiry : undefined,
      user: {
        uuid: user.uuid,
        email: user.email,
        role_id: user.role_id,
        first_name: user.first_name,
        last_name: user.last_name,
        dp: user.dp || null,
        instance: user.instance,
      },
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
};

// In the verify function
exports.verify = async (req, res, next) => {
  try {
    const { error } = verifySchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const { email, verificationCode } = req.body;
    const {
      user,
      accessToken,
      refreshToken,
      accessTokenExpiry,
      refreshTokenExpiry,
    } = await authService.verifyUser(email, verificationCode);

    const response = {
      success: true,
      message: "Account verified and logged in successfully",
      accessToken,
      accessTokenExpiry,
      refreshToken:
        process.env.NODE_ENV === "development" ? refreshToken : undefined,
      refreshTokenExpiry:
        process.env.NODE_ENV === "development" ? refreshTokenExpiry : undefined,
      user: {
        uuid: user.uuid,
        email: user.email,
        role_id: user.role_id,
        first_name: user.first_name,
        last_name: user.last_name,
        dp: user.dp || null,
        instance: user.instance,
      },
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
};

exports.forgotPassword = async (req, res, next) => {
  try {
    const { error } = forgotPasswordSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const { email } = req.body;
    await authService.forgotPassword(email);

    res.json({
      success: true,
      message: "Password reset code sent to your email",
    });
  } catch (error) {
    next(error);
  }
};

exports.resendVerification = async (req, res, next) => {
  try {
    const { error } = resendVerificationSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const { email } = req.body;
    await authService.resendVerificationCode(email);

    res.json({
      success: true,
      message: "Verification code resent successfully",
    });
  } catch (error) {
    next(error);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const { error } = resetPasswordSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const { email, verificationCode, verificationCodeOrToken, newPassword } =
      req.body;
    const codeOrToken = verificationCode || verificationCodeOrToken;

    await authService.resetPassword(email, codeOrToken, newPassword);

    res.json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    next(error);
  }
};

exports.logout = async (req, res, next) => {
  try {
    if (!req.user || !req.user.uuid) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    await authService.logoutUser(req.user.uuid);

    res
      .clearCookie("refreshToken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
      })
      .json({
        success: true,
        message: "Logged out successfully",
      });
  } catch (error) {
    next(error);
  }
};
