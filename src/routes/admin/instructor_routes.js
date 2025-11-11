const express = require("express");
const router = express.Router();

const adminInstructorController = require("../../controllers/admin/instructor_controller");
const { authenticate, authorize } = require("../../middleware/auth_middleware");
router.use(authenticate);
router.use(authorize(3));
router.get("/", adminInstructorController.getAllInstructors);

// Featured Mentors Routes (must come before /:instructorId)
router.get("/featured/mentors", adminInstructorController.getFeaturedMentors);

// Stats route (must come before /:instructorId)
router.get("/:instructorId/stats", adminInstructorController.getInstructorWithStats);

router.get("/:instructorId", adminInstructorController.getInstructorById);
router.post("/", adminInstructorController.createInstructor);
router.put("/:instructorId", adminInstructorController.updateInstructor);
router.delete("/:instructorId", adminInstructorController.deleteInstructor);

router.put("/:instructorId/featured/add", adminInstructorController.addFeaturedMentor);
router.put("/:instructorId/featured/remove", adminInstructorController.removeFeaturedMentor);

module.exports = router;
