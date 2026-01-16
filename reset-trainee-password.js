/**
 * Simple script to reset password for trainee@example.com
 * Usage: node reset-trainee-password.js
 */

const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function resetPassword() {
  // Default password that meets complexity requirements:
  // - At least 8 characters
  // - Contains uppercase, lowercase, numbers, and special characters
  const newPassword = 'Trainee@123';
  const email = 'trainee@example.com';

  try {
    // Hash the password
    console.log('Generating password hash...');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Create database connection
    console.log('Connecting to database...');
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'magnetix_db',
    });

    // Update password and set status to active
    console.log(`Updating password for ${email}...`);
    const [result] = await connection.execute(
      `UPDATE users
       SET password = ?,
           status = 'active',
           verification_code = NULL,
           updated_at = NOW()
       WHERE email = ?`,
      [hashedPassword, email]
    );

    await connection.end();

    if (result.affectedRows === 0) {
      console.error(`❌ User ${email} not found in database!`);
      console.log('\nPlease check if the user exists or create one first.');
      process.exit(1);
    }

    console.log(`\n✅ Password reset successful!`);
    console.log(`\nLogin credentials:`);
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${newPassword}`);
    console.log(`\nThe account has been activated and is ready to use.`);

  } catch (error) {
    console.error('❌ Error resetting password:', error.message);
    process.exit(1);
  }
}

resetPassword();
