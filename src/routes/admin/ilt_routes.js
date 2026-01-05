const express = require('express');
const router = express.Router();
const iltController = require('../../controllers/admin/ilt_controller');
const { authenticate, authorize } = require('../../middleware/auth_middleware');

// Apply authentication to all routes
router.use(authenticate);

// ==============================================
// STATISTICS ROUTES
// ==============================================

/**
 * GET /api/admin/ilt/stats
 * Get ILT dashboard statistics
 * Access: Admin, SuperAdmin
 */
router.get('/stats', authorize(3, 4), iltController.getStats);

// ==============================================
// LOCATIONS ROUTES
// ==============================================

/**
 * GET /api/admin/ilt/locations
 * Get all locations with search and status filters
 * Query params: search, status (optional)
 * Access: Admin, SuperAdmin
 */
router.get('/locations', authorize(3, 4), iltController.getLocations);

/**
 * GET /api/admin/ilt/locations/:id
 * Get location by ID with associated rooms
 * Access: Admin, SuperAdmin
 */
router.get('/locations/:id', authorize(3, 4), iltController.getLocationById);

/**
 * POST /api/admin/ilt/locations
 * Create a new location
 * Body: { name, city, state, country, address, zipCode, email, phone, capacity, timezone, manager, facilities }
 * Access: Admin, SuperAdmin
 */
router.post('/locations', authorize(3, 4), iltController.createLocation);

/**
 * PUT /api/admin/ilt/locations/:id
 * Update a location
 * Body: { name, city, state, country, address, zipCode, email, phone, capacity, timezone, manager, facilities, status }
 * Access: Admin, SuperAdmin
 */
router.put('/locations/:id', authorize(3, 4), iltController.updateLocation);

/**
 * DELETE /api/admin/ilt/locations/:id
 * Delete a location (soft delete)
 * Access: Admin, SuperAdmin
 */
router.delete('/locations/:id', authorize(3, 4), iltController.deleteLocation);

// ==============================================
// ROOMS ROUTES
// ==============================================

/**
 * GET /api/admin/ilt/rooms
 * Get all rooms with filters
 * Query params: search, status, locationId, type (all optional)
 * Access: Admin, SuperAdmin
 */
router.get('/rooms', authorize(3, 4), iltController.getRooms);

/**
 * GET /api/admin/ilt/rooms/:id
 * Get room by ID
 * Access: Admin, SuperAdmin
 */
router.get('/rooms/:id', authorize(3, 4), iltController.getRoomById);

/**
 * POST /api/admin/ilt/rooms
 * Create a new room
 * Body: { name, roomNumber, locationId, floor, type, capacity, area, description, amenities }
 * Access: Admin, SuperAdmin
 */
router.post('/rooms', authorize(3, 4), iltController.createRoom);

/**
 * PUT /api/admin/ilt/rooms/:id
 * Update a room
 * Body: { name, roomNumber, locationId, floor, type, capacity, area, description, amenities, status }
 * Access: Admin, SuperAdmin
 */
router.put('/rooms/:id', authorize(3, 4), iltController.updateRoom);

/**
 * DELETE /api/admin/ilt/rooms/:id
 * Delete a room (soft delete)
 * Access: Admin, SuperAdmin
 */
router.delete('/rooms/:id', authorize(3, 4), iltController.deleteRoom);

// ==============================================
// INSTRUCTOR/TRAINER MANAGEMENT ROUTES
// ==============================================

/**
 * GET /api/admin/ilt/available-instructors
 * Get all users with role_id=2 (instructors/trainers) available for trainer profile creation
 * Access: Admin, SuperAdmin
 */
router.get('/available-instructors', authorize(3, 4), iltController.getAvailableInstructors);

/**
 * POST /api/admin/ilt/trainers/from-user
 * Create a trainer profile from an existing instructor user
 * Body: { userId, bio?, expertise?, certifications?, rate? }
 * Access: Admin, SuperAdmin
 */
router.post('/trainers/from-user', authorize(3, 4), iltController.addTrainerFromUser);

// ==============================================
// TRAINERS ROUTES
// ==============================================

/**
 * GET /api/admin/ilt/trainers
 * Get all trainers with filters
 * Query params: search, status, availability (all optional)
 * Access: Trainer, Admin, SuperAdmin
 */
router.get('/trainers', authorize(2, 3, 4), iltController.getTrainers);

/**
 * GET /api/admin/ilt/trainers/:id
 * Get trainer by ID
 * Access: Trainer, Admin, SuperAdmin
 */
router.get('/trainers/:id', authorize(2, 3, 4), iltController.getTrainerById);

/**
 * POST /api/admin/ilt/trainers
 * Create a new trainer
 * Body: { userId, bio, expertise, certifications, experience, rate, availability, languages, initials, color }
 * Access: Admin, SuperAdmin
 */
router.post('/trainers', authorize(3, 4), iltController.createTrainer);

/**
 * PUT /api/admin/ilt/trainers/:id
 * Update a trainer
 * Body: { bio, expertise, certifications, experience, rate, availability, languages, status, initials, color }
 * Access: Own trainer profile OR Admin, SuperAdmin
 */
router.put('/trainers/:id', iltController.checkTrainerOrAdmin, iltController.updateTrainer);

/**
 * DELETE /api/admin/ilt/trainers/:id
 * Delete a trainer (soft delete)
 * Access: Admin, SuperAdmin
 */
router.delete('/trainers/:id', authorize(3, 4), iltController.deleteTrainer);

module.exports = router;
