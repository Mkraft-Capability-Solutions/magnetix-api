const { promisePool: pool } = require('../../config/db');

// ==============================================
// HELPER FUNCTIONS
// ==============================================

const parseJsonField = (value, defaultValue = []) => {
  try {
    if (!value) return defaultValue;
    if (typeof value === 'string') {
      return JSON.parse(value);
    }
    return value;
  } catch (error) {
    console.error('Error parsing JSON field:', error);
    return defaultValue;
  }
};

// ==============================================
// LOCATIONS SERVICE
// ==============================================

exports.getAllLocations = async (search = null, status = null) => {
  try {
    const [results] = await pool.query(
      'CALL sp_get_all_locations(?, ?)',
      [search, status]
    );

    const locations = results[0].map(location => ({
      ...location,
      facilities: parseJsonField(location.facilities, [])
    }));

    return locations;
  } catch (error) {
    console.error('ILT Service - getAllLocations error:', error);
    throw error;
  }
};

exports.getLocationById = async (id) => {
  try {
    const [results] = await pool.query(
      'CALL sp_get_location_by_id(?)',
      [id]
    );

    if (!results[0] || results[0].length === 0) {
      return null;
    }

    const location = {
      ...results[0][0],
      facilities: parseJsonField(results[0][0].facilities, [])
    };

    const rooms = results[1].map(room => ({
      ...room,
      amenities: parseJsonField(room.amenities, [])
    }));

    return { location, rooms };
  } catch (error) {
    console.error('ILT Service - getLocationById error:', error);
    throw error;
  }
};

exports.createLocation = async (locationData) => {
  try {
    const {
      name,
      city,
      state = null,
      country = 'USA',
      address,
      zipCode = null,
      email = null,
      phone = null,
      capacity = 0,
      timezone = null,
      manager = null,
      facilities = [],
      countryId = null,
      stateId = null,
      districtId = null
    } = locationData;

    const facilitiesJson = JSON.stringify(facilities);

    const [results] = await pool.query(
      'CALL sp_create_location(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [name, city, state, country, address, zipCode, email, phone, capacity, timezone, manager, facilitiesJson]
    );

    const locationId = results[0][0].id;

    // country_id/state_id/district_id aren't part of sp_create_location —
    // persist them separately when provided.
    if (countryId || stateId || districtId) {
      await pool.query(
        `UPDATE training_locations
         SET country_id = ?, state_id = ?, district_id = ?
         WHERE id = ?`,
        [countryId, stateId, districtId, locationId]
      );
    }

    return results[0][0];
  } catch (error) {
    console.error('ILT Service - createLocation error:', error);
    throw error;
  }
};

exports.updateLocation = async (id, locationData) => {
  try {
    const {
      name,
      city,
      state = null,
      country = 'USA',
      address,
      zipCode = null,
      email = null,
      phone = null,
      capacity = 0,
      timezone = null,
      manager = null,
      facilities = [],
      status = 'Active',
      countryId = null,
      stateId = null,
      districtId = null
    } = locationData;

    const facilitiesJson = JSON.stringify(facilities);

    const [results] = await pool.query(
      'CALL sp_update_location(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, name, city, state, country, address, zipCode, email, phone, capacity, timezone, manager, facilitiesJson, status]
    );

    // Use COALESCE so an update that omits these IDs preserves existing
    // values instead of wiping them — they aren't part of sp_update_location.
    await pool.query(
      `UPDATE training_locations
       SET country_id = COALESCE(?, country_id),
           state_id = COALESCE(?, state_id),
           district_id = COALESCE(?, district_id)
       WHERE id = ?`,
      [countryId, stateId, districtId, id]
    );

    return results[0][0];
  } catch (error) {
    console.error('ILT Service - updateLocation error:', error);
    throw error;
  }
};

exports.deleteLocation = async (id) => {
  try {
    const [results] = await pool.query(
      'CALL sp_delete_location(?)',
      [id]
    );

    return results[0][0];
  } catch (error) {
    console.error('ILT Service - deleteLocation error:', error);
    throw error;
  }
};

// ==============================================
// ROOMS SERVICE
// ==============================================

exports.getAllRooms = async (search = null, status = null, locationId = null, type = null) => {
  try {
    const [results] = await pool.query(
      'CALL sp_get_all_rooms(?, ?, ?, ?)',
      [search, status, locationId, type]
    );

    const rooms = results[0].map(room => ({
      ...room,
      amenities: parseJsonField(room.amenities, [])
    }));

    return rooms;
  } catch (error) {
    console.error('ILT Service - getAllRooms error:', error);
    throw error;
  }
};

exports.getRoomById = async (id) => {
  try {
    const [results] = await pool.query(
      'CALL sp_get_room_by_id(?)',
      [id]
    );

    if (!results[0] || results[0].length === 0) {
      return null;
    }

    const room = {
      ...results[0][0],
      amenities: parseJsonField(results[0][0].amenities, [])
    };

    return room;
  } catch (error) {
    console.error('ILT Service - getRoomById error:', error);
    throw error;
  }
};

exports.createRoom = async (roomData) => {
  try {
    const {
      name,
      roomNumber,
      locationId,
      floor = null,
      type = 'Conference',
      capacity,
      area = null,
      description = null,
      amenities = []
    } = roomData;

    const amenitiesJson = JSON.stringify(amenities);

    const [results] = await pool.query(
      'CALL sp_create_room(?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [name, roomNumber, locationId, floor, type, capacity, area, description, amenitiesJson]
    );

    return results[0][0];
  } catch (error) {
    console.error('ILT Service - createRoom error:', error);
    throw error;
  }
};

exports.updateRoom = async (id, roomData) => {
  try {
    const {
      name,
      roomNumber,
      locationId,
      floor = null,
      type = 'Conference',
      capacity,
      area = null,
      description = null,
      amenities = [],
      status = 'Active'
    } = roomData;

    const amenitiesJson = JSON.stringify(amenities);

    const [results] = await pool.query(
      'CALL sp_update_room(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, name, roomNumber, locationId, floor, type, capacity, area, description, amenitiesJson, status]
    );

    return results[0][0];
  } catch (error) {
    console.error('ILT Service - updateRoom error:', error);
    throw error;
  }
};

exports.deleteRoom = async (id) => {
  try {
    const [results] = await pool.query(
      'CALL sp_delete_room(?)',
      [id]
    );

    return results[0][0];
  } catch (error) {
    console.error('ILT Service - deleteRoom error:', error);
    throw error;
  }
};

// ==============================================
// TRAINERS SERVICE
// ==============================================

exports.getAllTrainers = async (search = null, status = null, availability = null) => {
  try {
    const [results] = await pool.query(
      'CALL sp_get_all_trainers(?, ?, ?)',
      [search, status, availability]
    );

    const trainers = results[0].map(trainer => ({
      ...trainer,
      expertise: parseJsonField(trainer.expertise, []),
      certifications: parseJsonField(trainer.certifications, []),
      languages: parseJsonField(trainer.languages, [])
    }));

    return trainers;
  } catch (error) {
    console.error('ILT Service - getAllTrainers error:', error);
    throw error;
  }
};

exports.getTrainerById = async (id) => {
  try {
    const [results] = await pool.query(
      'CALL sp_get_trainer_by_id(?)',
      [id]
    );

    if (!results[0] || results[0].length === 0) {
      return null;
    }

    const trainer = {
      ...results[0][0],
      expertise: parseJsonField(results[0][0].expertise, []),
      certifications: parseJsonField(results[0][0].certifications, []),
      languages: parseJsonField(results[0][0].languages, [])
    };

    return trainer;
  } catch (error) {
    console.error('ILT Service - getTrainerById error:', error);
    throw error;
  }
};

exports.createTrainer = async (trainerData) => {
  try {
    const {
      userId,
      bio = null,
      expertise = [],
      certifications = [],
      experience = 0,
      rate = 0,
      availability = 'Full-Time',
      languages = [],
      initials = null,
      color = null
    } = trainerData;

    const expertiseJson = JSON.stringify(expertise);
    const certificationsJson = JSON.stringify(certifications);
    const languagesJson = JSON.stringify(languages);

    const [results] = await pool.query(
      'CALL sp_create_trainer(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [userId, bio, expertiseJson, certificationsJson, experience, rate, availability, languagesJson, initials, color]
    );

    return results[0][0];
  } catch (error) {
    console.error('ILT Service - createTrainer error:', error);
    throw error;
  }
};

exports.updateTrainer = async (id, trainerData) => {
  try {
    const {
      firstName,
      lastName,
      phone,
      bio = null,
      expertise = [],
      certifications = [],
      experience = 0,
      rate = 0,
      availability = 'Full-Time',
      languages = [],
      status = 'Active',
      initials = null,
      color = null
    } = trainerData;

    const expertiseJson = JSON.stringify(expertise);
    const certificationsJson = JSON.stringify(certifications);
    const languagesJson = JSON.stringify(languages);

    const [results] = await pool.query(
      'CALL sp_update_trainer(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, bio, expertiseJson, certificationsJson, experience, rate, availability, languagesJson, status, initials, color]
    );

    // firstName/lastName/phone are not trainer columns — they live on the
    // students table that the trainer read path joins on (s.first_name,
    // s.last_name, s.contact). Persist them there so they survive the update.
    if (firstName !== undefined || lastName !== undefined || phone !== undefined) {
      const [[trainerRow]] = await pool.query(
        'SELECT user_id FROM trainers WHERE id = ? AND is_deleted = 0',
        [id]
      );

      if (trainerRow && trainerRow.user_id) {
        await pool.query(
          `INSERT INTO students (user_id, first_name, last_name, contact)
           VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             first_name = COALESCE(VALUES(first_name), first_name),
             last_name  = COALESCE(VALUES(last_name), last_name),
             contact    = COALESCE(VALUES(contact), contact)`,
          [
            trainerRow.user_id,
            firstName !== undefined ? firstName : null,
            lastName !== undefined ? lastName : null,
            phone !== undefined ? phone : null
          ]
        );
      }
    }

    return results[0][0];
  } catch (error) {
    console.error('ILT Service - updateTrainer error:', error);
    throw error;
  }
};

exports.deleteTrainer = async (id) => {
  try {
    const [results] = await pool.query(
      'CALL sp_delete_trainer(?)',
      [id]
    );

    return results[0][0];
  } catch (error) {
    console.error('ILT Service - deleteTrainer error:', error);
    throw error;
  }
};

// ==============================================
// STATISTICS SERVICE
// ==============================================

exports.getILTStats = async () => {
  try {
    const [results] = await pool.query('CALL sp_get_ilt_stats()');
    return results[0][0];
  } catch (error) {
    console.error('ILT Service - getILTStats error:', error);
    throw error;
  }
};

// ==============================================
// INSTRUCTOR MANAGEMENT
// ==============================================

exports.getAvailableInstructors = async () => {
  try {
    const [results] = await pool.query(`
      SELECT
        u.uuid,
        s.first_name as firstName,
        s.last_name as lastName,
        u.email,
        s.contact as phone
      FROM users u
      INNER JOIN students s ON u.uuid = s.user_id
      WHERE u.role_id = 2
        AND u.is_deleted = 0
      ORDER BY s.first_name, s.last_name
    `);

    return results;
  } catch (error) {
    console.error('ILT Service - getAvailableInstructors error:', error);
    throw error;
  }
};

exports.addTrainerFromUser = async (userId, trainerData = {}) => {
  try {
    // Verify user is an instructor (role_id=2)
    const [users] = await pool.query(
      'SELECT role_id FROM users WHERE uuid = ? AND is_deleted = 0',
      [userId]
    );

    if (users.length === 0 || users[0].role_id !== 2) {
      throw new Error('User is not an instructor');
    }

    // Check if trainer already exists
    const [existing] = await pool.query(
      'SELECT id FROM trainers WHERE user_id = ? AND is_deleted = 0',
      [userId]
    );

    if (existing.length > 0) {
      throw new Error('Trainer already exists for this user');
    }

    // Create trainer record with additional info
    const [result] = await pool.query(
      `INSERT INTO trainers
       (user_id, bio, expertise, certifications, rate, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'Active', NOW(), NOW())`,
      [
        userId,
        trainerData.bio || null,
        trainerData.expertise ? JSON.stringify(trainerData.expertise) : null,
        trainerData.certifications ? JSON.stringify(trainerData.certifications) : null,
        trainerData.rate || null
      ]
    );

    return result.insertId;
  } catch (error) {
    console.error('ILT Service - addTrainerFromUser error:', error);
    throw error;
  }
};
