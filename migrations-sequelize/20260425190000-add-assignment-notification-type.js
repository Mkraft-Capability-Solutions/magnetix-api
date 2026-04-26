'use strict';

module.exports = {
  async up({ context: queryInterface }) {
    await queryInterface.sequelize.query(
      `ALTER TABLE notifications
         MODIFY COLUMN notification_type
         ENUM('marketing','system','announcement','instructor','event','course','assignment')
         NOT NULL`
    );
  },
  async down({ context: queryInterface }) {
    // Revert to the previous ENUM (drops 'assignment' value).
    // Any rows currently set to 'assignment' must first be migrated to a valid value.
    await queryInterface.sequelize.query(
      `ALTER TABLE notifications
         MODIFY COLUMN notification_type
         ENUM('marketing','system','announcement','instructor','event','course')
         NOT NULL`
    );
  }
};
