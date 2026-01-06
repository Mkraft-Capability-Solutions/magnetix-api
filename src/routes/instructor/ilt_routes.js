const express = require('express');
const router = express.Router();
const iltController = require('../../controllers/instructor/ilt_controller');
const { authenticate, authorize } = require('../../middleware/auth_middleware');

// Apply authentication to all routes
router.use(authenticate);

// ==============================================
// STATISTICS ROUTES
// ==============================================

/**
 * GET /api/instructor/ilt/stats
 * Get ILT dashboard statistics
 * Access: Instructor
 */
router.get('/stats', authorize(2), iltController.getStats);

// ==============================================
// LOCATIONS ROUTES
// ==============================================

/**
 * GET /api/instructor/ilt/locations
 * Get all locations with search and status filters
 * Query params: search, status (optional)
 * Access: Instructor
 */
router.get('/locations', authorize(2), iltController.getLocations);

/**
 * GET /api/instructor/ilt/locations/:id
 * Get location by ID with associated rooms
 * Access: Instructor
 */
router.get('/locations/:id', authorize(2), iltController.getLocationById);

/**
 * POST /api/instructor/ilt/locations
 * Create a new location
 * Body: { name, city, state, country, address, zipCode, email, phone, capacity, timezone, manager, facilities }
 * Access: Instructor
 */
router.post('/locations', authorize(2), iltController.createLocation);

/**
 * PUT /api/instructor/ilt/locations/:id
 * Update a location
 * Body: { name, city, state, country, address, zipCode, email, phone, capacity, timezone, manager, facilities, status }
 * Access: Instructor
 */
router.put('/locations/:id', authorize(2), iltController.updateLocation);

/**
 * DELETE /api/instructor/ilt/locations/:id
 * Delete a location (soft delete)
 * Access: Instructor
 */
router.delete('/locations/:id', authorize(2), iltController.deleteLocation);

// ==============================================
// ROOMS ROUTES
// ==============================================

/**
 * GET /api/instructor/ilt/rooms
 * Get all rooms with filters
 * Query params: search, status, locationId, type (all optional)
 * Access: Instructor
 */
router.get('/rooms', authorize(2), iltController.getRooms);

/**
 * GET /api/instructor/ilt/rooms/:id
 * Get room by ID
 * Access: Instructor
 */
router.get('/rooms/:id', authorize(2), iltController.getRoomById);

/**
 * POST /api/instructor/ilt/rooms
 * Create a new room
 * Body: { name, roomNumber, locationId, floor, type, capacity, area, description, amenities }
 * Access: Instructor
 */
router.post('/rooms', authorize(2), iltController.createRoom);

/**
 * PUT /api/instructor/ilt/rooms/:id
 * Update a room
 * Body: { name, roomNumber, locationId, floor, type, capacity, area, description, amenities, status }
 * Access: Instructor
 */
router.put('/rooms/:id', authorize(2), iltController.updateRoom);

/**
 * DELETE /api/instructor/ilt/rooms/:id
 * Delete a room (soft delete)
 * Access: Instructor
 */
router.delete('/rooms/:id', authorize(2), iltController.deleteRoom);

// ==============================================
// INSTRUCTOR/TRAINER MANAGEMENT ROUTES
// ==============================================

/**
 * GET /api/instructor/ilt/available-instructors
 * Get all users with role_id=2 (instructors/trainers) available for trainer profile creation
 * Access: Instructor
 */
router.get('/available-instructors', authorize(2), iltController.getAvailableInstructors);

/**
 * POST /api/instructor/ilt/trainers/from-user
 * Create a trainer profile from an existing instructor user
 * Body: { userId, bio?, expertise?, certifications?, rate? }
 * Access: Instructor
 */
router.post('/trainers/from-user', authorize(2), iltController.addTrainerFromUser);

// ==============================================
// TRAINERS ROUTES
// ==============================================

/**
 * GET /api/instructor/ilt/trainers
 * Get all trainers with filters
 * Query params: search, status, availability (all optional)
 * Access: Instructor
 */
router.get('/trainers', authorize(2), iltController.getTrainers);

/**
 * GET /api/instructor/ilt/trainers/:id
 * Get trainer by ID
 * Access: Instructor
 */
router.get('/trainers/:id', authorize(2), iltController.getTrainerById);

/**
 * POST /api/instructor/ilt/trainers
 * Create a new trainer
 * Body: { userId, bio, expertise, certifications, experience, rate, availability, languages, initials, color }
 * Access: Instructor
 */
router.post('/trainers', authorize(2), iltController.createTrainer);

/**
 * PUT /api/instructor/ilt/trainers/:id
 * Update a trainer
 * Body: { bio, expertise, certifications, experience, rate, availability, languages, status, initials, color }
 * Access: Instructor
 */
router.put('/trainers/:id', authorize(2), iltController.updateTrainer);

/**
 * DELETE /api/instructor/ilt/trainers/:id
 * Delete a trainer (soft delete)
 * Access: Instructor
 */
router.delete('/trainers/:id', authorize(2), iltController.deleteTrainer);

module.exports = router;
