const express = require('express');
const router = express.Router();
const iltController = require('../../controllers/super_admin/ilt_controller');
const { authenticate, authorize } = require('../../middleware/auth_middleware');

// Apply authentication to all routes
router.use(authenticate);

// Apply authorization - SuperAdmin (4) only
router.use(authorize(4));

// ==============================================
// STATISTICS ROUTES
// ==============================================

/**
 * GET /api/super-admin/ilt/stats
 * Get ILT dashboard statistics
 * Access: SuperAdmin
 */
router.get('/stats', iltController.getStats);

// ==============================================
// LOCATIONS ROUTES
// ==============================================

/**
 * GET /api/super-admin/ilt/locations
 * Get all locations with search and status filters
 * Query params: search, status (optional)
 * Access: SuperAdmin
 */
router.get('/locations', iltController.getLocations);

/**
 * GET /api/super-admin/ilt/locations/:id
 * Get location by ID with associated rooms
 * Access: SuperAdmin
 */
router.get('/locations/:id', iltController.getLocationById);

/**
 * POST /api/super-admin/ilt/locations
 * Create a new location
 * Body: { name, city, state, country, address, zipCode, email, phone, capacity, timezone, manager, facilities }
 * Access: SuperAdmin
 */
router.post('/locations', iltController.createLocation);

/**
 * PUT /api/super-admin/ilt/locations/:id
 * Update a location
 * Body: { name, city, state, country, address, zipCode, email, phone, capacity, timezone, manager, facilities, status }
 * Access: SuperAdmin
 */
router.put('/locations/:id', iltController.updateLocation);

/**
 * DELETE /api/super-admin/ilt/locations/:id
 * Delete a location (soft delete)
 * Access: SuperAdmin
 */
router.delete('/locations/:id', iltController.deleteLocation);

// ==============================================
// ROOMS ROUTES
// ==============================================

/**
 * GET /api/super-admin/ilt/rooms
 * Get all rooms with filters
 * Query params: search, status, locationId, type (all optional)
 * Access: SuperAdmin
 */
router.get('/rooms', iltController.getRooms);

/**
 * GET /api/super-admin/ilt/rooms/:id
 * Get room by ID
 * Access: SuperAdmin
 */
router.get('/rooms/:id', iltController.getRoomById);

/**
 * POST /api/super-admin/ilt/rooms
 * Create a new room
 * Body: { name, roomNumber, locationId, floor, type, capacity, area, description, amenities }
 * Access: SuperAdmin
 */
router.post('/rooms', iltController.createRoom);

/**
 * PUT /api/super-admin/ilt/rooms/:id
 * Update a room
 * Body: { name, roomNumber, locationId, floor, type, capacity, area, description, amenities, status }
 * Access: SuperAdmin
 */
router.put('/rooms/:id', iltController.updateRoom);

/**
 * DELETE /api/super-admin/ilt/rooms/:id
 * Delete a room (soft delete)
 * Access: SuperAdmin
 */
router.delete('/rooms/:id', iltController.deleteRoom);

// ==============================================
// INSTRUCTOR/TRAINER MANAGEMENT ROUTES
// ==============================================

/**
 * GET /api/super-admin/ilt/available-instructors
 * Get all users with role_id=2 (instructors/trainers) available for trainer profile creation
 * Access: SuperAdmin
 */
router.get('/available-instructors', iltController.getAvailableInstructors);

/**
 * POST /api/super-admin/ilt/trainers/from-user
 * Create a trainer profile from an existing instructor user
 * Body: { userId, bio?, expertise?, certifications?, rate? }
 * Access: SuperAdmin
 */
router.post('/trainers/from-user', iltController.addTrainerFromUser);

// ==============================================
// TRAINERS ROUTES
// ==============================================

/**
 * GET /api/super-admin/ilt/trainers
 * Get all trainers with filters
 * Query params: search, status, availability (all optional)
 * Access: SuperAdmin
 */
router.get('/trainers', iltController.getTrainers);

/**
 * GET /api/super-admin/ilt/trainers/:id
 * Get trainer by ID
 * Access: SuperAdmin
 */
router.get('/trainers/:id', iltController.getTrainerById);

/**
 * POST /api/super-admin/ilt/trainers
 * Create a new trainer
 * Body: { userId, bio, expertise, certifications, experience, rate, availability, languages, initials, color }
 * Access: SuperAdmin
 */
router.post('/trainers', iltController.createTrainer);

/**
 * PUT /api/super-admin/ilt/trainers/:id
 * Update a trainer
 * Body: { bio, expertise, certifications, experience, rate, availability, languages, status, initials, color }
 * Access: SuperAdmin
 */
router.put('/trainers/:id', iltController.updateTrainer);

/**
 * DELETE /api/super-admin/ilt/trainers/:id
 * Delete a trainer (soft delete)
 * Access: SuperAdmin
 */
router.delete('/trainers/:id', iltController.deleteTrainer);

module.exports = router;
