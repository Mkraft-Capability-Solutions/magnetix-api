const authService = require('../services/auth_service');
const UserDTO = require('../dto/user_dto');

exports.register = async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, roleId } = req.body;
    
    // Basic validation
    if (!email || !password || !firstName || !lastName || !roleId) {
      return res.status(400).json({ message: 'All fields are required' });
    }

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
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const { user, token } = await authService.loginUser(email, password);
    
    res.json({
      message: 'Login successful',
      token,
      user
    });
  } catch (error) {
    next(error);
  }
};

exports.verify = async (req, res, next) => {
  try {
    const { email, verificationCode } = req.body;
    
    if (!email || !verificationCode) {
      return res.status(400).json({ message: 'Email and verification code are required' });
    }

    await authService.verifyUser(email, verificationCode);
    res.json({ message: 'Account verified successfully' });
  } catch (error) {
    next(error);
  }
};

exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    await authService.forgotPassword(email);
    res.json({ message: 'Password reset code sent to your email' });
  } catch (error) {
    next(error);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const { email, verificationCode, newPassword } = req.body;
    
    if (!email || !verificationCode || !newPassword) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    await authService.resetPassword(email, verificationCode, newPassword);
    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    next(error);
  }
};