

const authService = require('../services/auth_service');
const UserDTO = require('../dto/user_dto');
const Joi = require('joi');

// Validation schemas
const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  firstName: Joi.string().required(),
  lastName: Joi.string().required(),
  roleId: Joi.number().integer().min(1).max(4).required()
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

const verifySchema = Joi.object({
  email: Joi.string().email().required(),
  verificationCode: Joi.string().length(6).required()
});

const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required()
});

const resetPasswordSchema = Joi.object({
  email: Joi.string().email().required(),
  verificationCode: Joi.string().optional(),
  verificationCodeOrToken: Joi.string().optional(),
  newPassword: Joi.string().min(8).required()
}).or('verificationCode', 'verificationCodeOrToken');

const resendVerificationSchema = Joi.object({
  email: Joi.string().email().required()
});

exports.register = async (req, res, next) => {
  try {
    const { error } = registerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { email, password, firstName, lastName, roleId } = req.body;
    const user = await authService.registerUser(email, password, firstName, lastName, roleId);
    
    res.status(201).json({
      message: 'User registered successfully. Please check your email for verification.',
      user
    });
  } catch (error) {
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { error } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { email, password } = req.body;
    const { user, token } = await authService.loginUser(email, password);
    
    res.json({
      message: 'Login successful',
      token,
      user: {
        uuid: user.uuid,
        email: user.email,
        role_id: user.role_id,
        first_name: user.first_name,
        last_name: user.last_name,
        dp: user.dp || null, // Include profile picture
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.verify = async (req, res, next) => {
  try {
    const { error } = verifySchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { email, verificationCode } = req.body;
    const { user, token } = await authService.verifyUser(email, verificationCode);
    
    if (!user || !user.role_id) {
      throw new Error("User data incomplete");
    }

    res.json({ 
      message: 'Account verified and logged in successfully',
      token, // Include token directly
      user: {
        uuid: user.uuid,
        email: user.email,
        role_id: user.role_id,
        first_name: user.first_name,
        last_name: user.last_name,
        dp: user.dp || null, // Include profile picture
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.forgotPassword = async (req, res, next) => {
  try {
    const { error } = forgotPasswordSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { email } = req.body;
    await authService.forgotPassword(email);
    
    res.json({ message: 'Password reset code sent to your email' });
  } catch (error) {
    next(error);
  }
};

exports.resendVerification = async (req, res, next) => {
  try {
    const { error } = resendVerificationSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { email } = req.body;
    await authService.resendVerificationCode(email);
    
    res.json({ message: 'Verification code resent successfully' });
  } catch (error) {
    next(error);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const { error } = resetPasswordSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { email, verificationCode, verificationCodeOrToken, newPassword } = req.body;
    const codeOrToken = verificationCode || verificationCodeOrToken;
    
    await authService.resetPassword(email, codeOrToken, newPassword);
    
    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    next(error);
  }
};


exports.logout = async (req, res, next) => {
  try {
    await authService.logoutUser(req.user.uuid);
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};