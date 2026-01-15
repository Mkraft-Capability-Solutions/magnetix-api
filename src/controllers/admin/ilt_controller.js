const iltService = require('../../services/admin/ilt_service');

// ==============================================
// LOCATIONS CONTROLLERS
// ==============================================

exports.getLocations = async (req, res) => {
  try {
    const { search, status } = req.query;
    const locations = await iltService.getAllLocations(search, status);

    res.json({
      success: true,
      data: locations
    });
  } catch (error) {
    console.error('ILT Controller - getLocations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch locations',
      error: error.message
    });
  }
};

exports.getLocationById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await iltService.getLocationById(id);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Location not found'
      });
    }

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('ILT Controller - getLocationById error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch location',
      error: error.message
    });
  }
};

exports.createLocation = async (req, res) => {
  try {
    const { name, city, address } = req.body;

    // Validation
    if (!name || !city || !address) {
      return res.status(400).json({
        success: false,
        message: 'Name, city, and address are required'
      });
    }

    const result = await iltService.createLocation(req.body);

    res.status(201).json({
      success: true,
      data: result,
      message: 'Location created successfully'
    });
  } catch (error) {
    console.error('ILT Controller - createLocation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create location',
      error: error.message
    });
  }
};

exports.updateLocation = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, city, address } = req.body;

    // Validation
    if (!name || !city || !address) {
      return res.status(400).json({
        success: false,
        message: 'Name, city, and address are required'
      });
    }

    const result = await iltService.updateLocation(id, req.body);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Location not found'
      });
    }

    res.json({
      success: true,
      message: 'Location updated successfully'
    });
  } catch (error) {
    console.error('ILT Controller - updateLocation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update location',
      error: error.message
    });
  }
};

exports.deleteLocation = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await iltService.deleteLocation(id);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message,
        roomCount: result.roomCount
      });
    }

    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error('ILT Controller - deleteLocation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete location',
      error: error.message
    });
  }
};

// ==============================================
// ROOMS CONTROLLERS
// ==============================================

exports.getRooms = async (req, res) => {
  try {
    const { search, status, locationId, type } = req.query;
    const rooms = await iltService.getAllRooms(search, status, locationId, type);

    res.json({
      success: true,
      data: rooms
    });
  } catch (error) {
    console.error('ILT Controller - getRooms error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch rooms',
      error: error.message
    });
  }
};

exports.getRoomById = async (req, res) => {
  try {
    const { id } = req.params;
    const room = await iltService.getRoomById(id);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    res.json({
      success: true,
      data: room
    });
  } catch (error) {
    console.error('ILT Controller - getRoomById error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch room',
      error: error.message
    });
  }
};

exports.createRoom = async (req, res) => {
  try {
    const { name, roomNumber, locationId, capacity } = req.body;

    // Validation
    if (!name || !roomNumber || !locationId || !capacity) {
      return res.status(400).json({
        success: false,
        message: 'Name, room number, location ID, and capacity are required'
      });
    }

    const result = await iltService.createRoom(req.body);

    res.status(201).json({
      success: true,
      data: result,
      message: 'Room created successfully'
    });
  } catch (error) {
    console.error('ILT Controller - createRoom error:', error);

    // Check for location not found error
    if (error.message.includes('Location not found')) {
      return res.status(400).json({
        success: false,
        message: 'Location not found'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create room',
      error: error.message
    });
  }
};

exports.updateRoom = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, roomNumber, locationId, capacity } = req.body;

    // Validation
    if (!name || !roomNumber || !locationId || !capacity) {
      return res.status(400).json({
        success: false,
        message: 'Name, room number, location ID, and capacity are required'
      });
    }

    const result = await iltService.updateRoom(id, req.body);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    res.json({
      success: true,
      message: 'Room updated successfully'
    });
  } catch (error) {
    console.error('ILT Controller - updateRoom error:', error);

    // Check for location not found error
    if (error.message.includes('Location not found')) {
      return res.status(400).json({
        success: false,
        message: 'Location not found'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update room',
      error: error.message
    });
  }
};

exports.deleteRoom = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await iltService.deleteRoom(id);

    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error('ILT Controller - deleteRoom error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete room',
      error: error.message
    });
  }
};

// ==============================================
// TRAINERS CONTROLLERS
// ==============================================

exports.getTrainers = async (req, res) => {
  try {
    const { search, status, availability } = req.query;
    const trainers = await iltService.getAllTrainers(search, status, availability);

    res.json({
      success: true,
      data: trainers
    });
  } catch (error) {
    console.error('ILT Controller - getTrainers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch trainers',
      error: error.message
    });
  }
};

exports.getTrainerById = async (req, res) => {
  try {
    const { id } = req.params;
    const trainer = await iltService.getTrainerById(id);

    if (!trainer) {
      return res.status(404).json({
        success: false,
        message: 'Trainer not found'
      });
    }

    res.json({
      success: true,
      data: trainer
    });
  } catch (error) {
    console.error('ILT Controller - getTrainerById error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch trainer',
      error: error.message
    });
  }
};

exports.createTrainer = async (req, res) => {
  try {
    const { userId } = req.body;

    // Validation
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    const result = await iltService.createTrainer(req.body);

    res.status(201).json({
      success: true,
      data: result,
      message: 'Trainer created successfully'
    });
  } catch (error) {
    console.error('ILT Controller - createTrainer error:', error);

    // Check for specific errors
    if (error.message.includes('User not found')) {
      return res.status(400).json({
        success: false,
        message: 'User not found'
      });
    }

    if (error.message.includes('already has a trainer profile')) {
      return res.status(400).json({
        success: false,
        message: 'User already has a trainer profile'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create trainer',
      error: error.message
    });
  }
};

exports.updateTrainer = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await iltService.updateTrainer(id, req.body);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Trainer not found'
      });
    }

    res.json({
      success: true,
      message: 'Trainer updated successfully'
    });
  } catch (error) {
    console.error('ILT Controller - updateTrainer error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update trainer',
      error: error.message
    });
  }
};

exports.deleteTrainer = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await iltService.deleteTrainer(id);

    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error('ILT Controller - deleteTrainer error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete trainer',
      error: error.message
    });
  }
};

// ==============================================
// STATISTICS CONTROLLER
// ==============================================

exports.getStats = async (req, res) => {
  try {
    const stats = await iltService.getILTStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('ILT Controller - getStats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
};

// ==============================================
// INSTRUCTOR/TRAINER MANAGEMENT
// ==============================================

exports.getAvailableInstructors = async (req, res) => {
  try {
    const instructors = await iltService.getAvailableInstructors();

    res.json({
      success: true,
      data: instructors
    });
  } catch (error) {
    console.error('ILT Controller - getAvailableInstructors error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch available instructors',
      error: error.message
    });
  }
};

exports.addTrainerFromUser = async (req, res) => {
  try {
    const { userId } = req.body;

    // Validation
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    const trainerId = await iltService.addTrainerFromUser(userId, req.body);

    res.status(201).json({
      success: true,
      data: { id: trainerId },
      message: 'Trainer created from instructor successfully'
    });
  } catch (error) {
    console.error('ILT Controller - addTrainerFromUser error:', error);

    // Check for specific errors
    if (error.message.includes('not an instructor')) {
      return res.status(400).json({
        success: false,
        message: 'User is not an instructor (role_id must be 2)'
      });
    }

    if (error.message.includes('already exists')) {
      return res.status(400).json({
        success: false,
        message: 'Trainer already exists for this user'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create trainer from user',
      error: error.message
    });
  }
};

// ==============================================
// CUSTOM MIDDLEWARE
// ==============================================

exports.checkTrainerOrAdmin = async (req, res, next) => {
  try {
    const trainerId = parseInt(req.params.id);
    const userRoleId = req.user.role_id;
    const userId = req.user.uuid;

    // Allow if admin or superadmin
    if ([3, 4].includes(userRoleId)) {
      return next();
    }

    // Allow if trainer editing own profile
    if (userRoleId === 2) {
      const trainer = await iltService.getTrainerById(trainerId);

      if (trainer && trainer.userId === userId) {
        return next();
      }
    }

    return res.status(403).json({
      success: false,
      message: 'Not authorized to perform this action'
    });
  } catch (error) {
    console.error('ILT Controller - checkTrainerOrAdmin error:', error);
    res.status(500).json({
      success: false,
      message: 'Authorization check failed',
      error: error.message
    });
  }
};

// ==============================================
// LOCATION MASTER DATA CONTROLLERS
// ==============================================

exports.getCountries = async (req, res) => {
  try {
    const countries = await iltService.getCountries();

    res.json({
      success: true,
      data: countries
    });
  } catch (error) {
    console.error('ILT Controller - getCountries error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch countries',
      error: error.message
    });
  }
};

exports.getStatesByCountry = async (req, res) => {
  try {
    const { countryId } = req.params;

    if (!countryId) {
      return res.status(400).json({
        success: false,
        message: 'Country ID is required'
      });
    }

    const states = await iltService.getStatesByCountry(countryId);

    res.json({
      success: true,
      data: states
    });
  } catch (error) {
    console.error('ILT Controller - getStatesByCountry error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch states',
      error: error.message
    });
  }
};

exports.getDistrictsByState = async (req, res) => {
  try {
    const { stateId } = req.params;

    if (!stateId) {
      return res.status(400).json({
        success: false,
        message: 'State ID is required'
      });
    }

    const districts = await iltService.getDistrictsByState(stateId);

    res.json({
      success: true,
      data: districts
    });
  } catch (error) {
    console.error('ILT Controller - getDistrictsByState error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch districts',
      error: error.message
    });
  }
};
