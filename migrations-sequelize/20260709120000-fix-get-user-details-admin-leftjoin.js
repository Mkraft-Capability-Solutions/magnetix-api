'use strict';

/**
 * Fix `get_user_details` for Admins / Super Admins.
 *
 * The procedure returned rows per role by JOINing the role's profile table.
 * For roles 3 (Admin) and 4 (Super Admin) it used an INNER JOIN to `admins`,
 * so any admin/super-admin WITHOUT an `admins` profile row got an empty result
 * — which the service surfaces as "User not found" (e.g. GET /users/me fails,
 * breaking course creation for Super Admins).
 *
 * Fix: make the admin/super-admin branch a LEFT JOIN so the core user record
 * is always returned (profile fields null when there's no `admins` row).
 * Student (1) and Instructor (2) branches are unchanged.
 *
 * NOTE: no DELIMITER here — the driver sends the whole CREATE PROCEDURE body as
 * a single statement, so its internal `;` are fine.
 */

const DROP = 'DROP PROCEDURE IF EXISTS `get_user_details`';

const CREATE_LEFT_JOIN = `
CREATE PROCEDURE get_user_details(IN p_uuid VARCHAR(36))
BEGIN
    DECLARE v_role_id INT;
    SELECT role_id INTO v_role_id FROM users WHERE uuid = p_uuid AND is_deleted = 0;
    IF v_role_id IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'User not found';
    END IF;
    IF v_role_id = 1 THEN
        SELECT u.uuid, u.email, u.role_id, u.status, s.address, s.dob, s.gender, s.contact,
               s.last_name, s.first_name, s.dp, s.specialization, s.country, s.state, s.city,
               s.profile_visibility, s.resume_url, s.about, s.social_links
        FROM users u JOIN students s ON u.uuid = s.user_id
        WHERE u.uuid = p_uuid AND u.is_deleted = 0;
    ELSEIF v_role_id = 2 THEN
        SELECT u.uuid, u.email, u.role_id, u.status, i.address, i.dob, i.gender, i.contact,
               i.last_name, i.first_name, i.dp, i.expertise, i.country, i.state, i.city,
               i.profile_visibility, i.resume_url, i.about, i.social_links
        FROM users u JOIN instructors i ON u.uuid = i.user_id
        WHERE u.uuid = p_uuid AND u.is_deleted = 0;
    ELSEIF v_role_id = 3 OR v_role_id = 4 THEN
        SELECT u.uuid, u.email, u.role_id, u.status, a.address, a.dob, a.gender, a.contact,
               a.last_name, a.first_name, a.dp, a.country, a.state, a.city,
               a.profile_visibility, a.resume_url, a.about, a.social_links,
               NULL as expertise, NULL as specialization
        FROM users u LEFT JOIN admins a ON u.uuid = a.user_id
        WHERE u.uuid = p_uuid AND u.is_deleted = 0;
    END IF;
END`;

// Original (pre-fix) definition with an INNER JOIN on admins — used by down().
const CREATE_INNER_JOIN = `
CREATE PROCEDURE get_user_details(IN p_uuid VARCHAR(36))
BEGIN
    DECLARE v_role_id INT;
    SELECT role_id INTO v_role_id FROM users WHERE uuid = p_uuid AND is_deleted = 0;
    IF v_role_id IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'User not found';
    END IF;
    IF v_role_id = 1 THEN
        SELECT u.uuid, u.email, u.role_id, u.status, s.address, s.dob, s.gender, s.contact,
               s.last_name, s.first_name, s.dp, s.specialization, s.country, s.state, s.city,
               s.profile_visibility, s.resume_url, s.about, s.social_links
        FROM users u JOIN students s ON u.uuid = s.user_id
        WHERE u.uuid = p_uuid AND u.is_deleted = 0;
    ELSEIF v_role_id = 2 THEN
        SELECT u.uuid, u.email, u.role_id, u.status, i.address, i.dob, i.gender, i.contact,
               i.last_name, i.first_name, i.dp, i.expertise, i.country, i.state, i.city,
               i.profile_visibility, i.resume_url, i.about, i.social_links
        FROM users u JOIN instructors i ON u.uuid = i.user_id
        WHERE u.uuid = p_uuid AND u.is_deleted = 0;
    ELSEIF v_role_id = 3 OR v_role_id = 4 THEN
        SELECT u.uuid, u.email, u.role_id, u.status, a.address, a.dob, a.gender, a.contact,
               a.last_name, a.first_name, a.dp, a.country, a.state, a.city,
               a.profile_visibility, a.resume_url, a.about, a.social_links,
               NULL as expertise, NULL as specialization
        FROM users u JOIN admins a ON u.uuid = a.user_id
        WHERE u.uuid = p_uuid AND u.is_deleted = 0;
    END IF;
END`;

module.exports = {
  async up({ context: queryInterface }) {
    await queryInterface.sequelize.query(DROP);
    await queryInterface.sequelize.query(CREATE_LEFT_JOIN);
    console.log('  ✅ get_user_details recreated (LEFT JOIN admins for role 3/4)');
  },

  async down({ context: queryInterface }) {
    await queryInterface.sequelize.query(DROP);
    await queryInterface.sequelize.query(CREATE_INNER_JOIN);
  },
};
