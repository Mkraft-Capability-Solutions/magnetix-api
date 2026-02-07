const certificationService = require("../../services/admin/certification_service");

// ============================================================================
// GET USER'S CERTIFICATION ENROLLMENTS WITH PROGRESS
// ============================================================================

exports.getMyCertificationEnrollments = async (req, res, next) => {
  try {
    const userId = req.user.uuid; // Get user ID from authenticated user

    console.log("getMyCertificationEnrollments called for user:", userId);

    const result = await certificationService.getUserCertificationEnrollments(userId);

    res.json(result);
  } catch (error) {
    console.error("Error in getMyCertificationEnrollments controller:", error);
    next(error);
  }
};

// ============================================================================
// DEBUG: CHECK WHICH CERTIFICATIONS INCLUDE A COURSE
// ============================================================================

exports.checkCertificationsForCourse = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.uuid;

    console.log(`[DEBUG] Checking certifications for course ${courseId} and user ${userId}`);

    const result = await certificationService.getCertificationsForCourse(courseId);

    res.json({
      success: true,
      courseId,
      userId,
      ...result,
    });
  } catch (error) {
    console.error("Error in checkCertificationsForCourse controller:", error);
    next(error);
  }
};

// ============================================================================
// DEBUG: MANUALLY TRIGGER AUTO-ENROLLMENT
// ============================================================================

exports.manualAutoEnroll = async (req, res, next) => {
  try {
    const { courseId } = req.body;
    const userId = req.user.uuid;

    console.log(`[DEBUG] Manually triggering auto-enrollment for user ${userId} in course ${courseId}`);

    const result = await certificationService.autoEnrollInCertifications(userId, courseId);

    res.json(result);
  } catch (error) {
    console.error("Error in manualAutoEnroll controller:", error);
    next(error);
  }
};
