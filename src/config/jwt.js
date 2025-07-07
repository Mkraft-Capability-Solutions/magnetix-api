require('dotenv').config();

module.exports = {
  accessSecret: process.env.JWT_ACCESS_SECRET,
  refreshSecret: process.env.JWT_REFRESH_SECRET,
  accessExpiresIn: process.env.JWT_ACCESS_EXPIRY,
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRY,
};