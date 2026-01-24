const certificationService = require("../../services/admin/certification_service");
const Joi = require("joi");

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const certificationSchema = Joi.object({
  certification_name: Joi.string().required().min(3).max(255),
  description: Joi.string().allow("", null).optional(),
  validity_period: Joi.number().integer().min(1).allow(null).optional(),
  validity_type: Joi.string().valid("lifetime", "limited").default("lifetime"),
  template_file_path: Joi.string().allow("", null).optional(),
  status: Joi.string().valid("active", "inactive").default("active"),
  course_ids: Joi.array().items(Joi.number().integer()).optional().default([]),
});

const updateCertificationSchema = Joi.object({
  certification_name: Joi.string().min(3).max(255).optional(),
  description: Joi.string().allow("", null).optional(),
  validity_period: Joi.number().integer().min(1).allow(null).optional(),
  validity_type: Joi.string().valid("lifetime", "limited").optional(),
  template_file_path: Joi.string().allow("", null).optional(),
  status: Joi.string().valid("active", "inactive").optional(),
  course_ids: Joi.array().items(Joi.number().integer()).optional(),
});

// ============================================================================
// CREATE CERTIFICATION
// ============================================================================

exports.createCertification = async (req, res, next) => {
  try {
    console.log("createCertification endpoint called with body:", JSON.stringify(req.body, null, 2));

    const { error } = certificationSchema.validate(req.body, { abortEarly: false });
    if (error) {
      console.log("Validation errors:", error.details.map((detail) => detail.message));
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        details: error.details.map((detail) => detail.message),
      });
    }

    const result = await certificationService.createCertification(
      req.body,
      req.user.uuid
    );

    res.status(201).json({
      success: true,
      message: "Certification created successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error in createCertification controller:", error);
    next(error);
  }
};

// ============================================================================
// GET ALL CERTIFICATIONS (WITH FILTERS AND PAGINATION)
// ============================================================================

exports.getAllCertifications = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status || null; // 'active', 'inactive', or null for all
    const search = req.query.search || null;

    console.log("getAllCertifications called with params:", { page, limit, status, search });

    const result = await certificationService.getAllCertifications(
      page,
      limit,
      status,
      search
    );

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Error in getAllCertifications controller:", error);
    next(error);
  }
};

// ============================================================================
// GET CERTIFICATION BY ID
// ============================================================================

exports.getCertificationById = async (req, res, next) => {
  try {
    const certificationId = req.params.certificationId;
    console.log("getCertificationById called for ID:", certificationId);

    const result = await certificationService.getCertificationById(certificationId);

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Error in getCertificationById controller:", error);
    if (error.message === "Certification not found") {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

// ============================================================================
// UPDATE CERTIFICATION
// ============================================================================

exports.updateCertification = async (req, res, next) => {
  try {
    const certificationId = req.params.certificationId;
    console.log("updateCertification called for ID:", certificationId, "with body:", JSON.stringify(req.body, null, 2));

    const { error } = updateCertificationSchema.validate(req.body, { abortEarly: false });
    if (error) {
      console.log("Validation errors:", error.details.map((detail) => detail.message));
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        details: error.details.map((detail) => detail.message),
      });
    }

    const result = await certificationService.updateCertification(
      certificationId,
      req.body,
      req.user.uuid
    );

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Error in updateCertification controller:", error);
    if (error.message === "Certification not found") {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

// ============================================================================
// DELETE CERTIFICATION
// ============================================================================

exports.deleteCertification = async (req, res, next) => {
  try {
    const certificationId = req.params.certificationId;
    console.log("deleteCertification called for ID:", certificationId);

    const result = await certificationService.deleteCertification(certificationId);

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Error in deleteCertification controller:", error);
    if (error.message === "Certification not found") {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

// ============================================================================
// GET ACTIVE COURSES (FOR DROPDOWN)
// ============================================================================

exports.getActiveCourses = async (req, res, next) => {
  try {
    console.log("getActiveCourses endpoint called");

    const result = await certificationService.getActiveCourses();

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Error in getActiveCourses controller:", error);
    next(error);
  }
};

// ============================================================================
// TOGGLE CERTIFICATION STATUS
// ============================================================================

exports.toggleCertificationStatus = async (req, res, next) => {
  try {
    const certificationId = req.params.certificationId;
    console.log("toggleCertificationStatus called for ID:", certificationId);

    const result = await certificationService.toggleCertificationStatus(
      certificationId,
      req.user.uuid
    );

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Error in toggleCertificationStatus controller:", error);
    if (error.message === "Certification not found") {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

// ============================================================================
// ADD COURSE REQUIREMENT
// ============================================================================

exports.addCourseRequirement = async (req, res, next) => {
  try {
    const certificationId = req.params.certificationId;
    const { course_id } = req.body;

    console.log("addCourseRequirement called for certification:", certificationId, "course:", course_id);

    if (!course_id) {
      return res.status(400).json({
        success: false,
        message: "course_id is required",
      });
    }

    const result = await certificationService.addCourseRequirement(
      certificationId,
      course_id
    );

    res.status(201).json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Error in addCourseRequirement controller:", error);
    if (error.message.includes("already added")) {
      return res.status(409).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

// ============================================================================
// REMOVE COURSE REQUIREMENT
// ============================================================================

exports.removeCourseRequirement = async (req, res, next) => {
  try {
    const certificationId = req.params.certificationId;
    const courseId = req.params.courseId;

    console.log("removeCourseRequirement called for certification:", certificationId, "course:", courseId);

    const result = await certificationService.removeCourseRequirement(
      certificationId,
      courseId
    );

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Error in removeCourseRequirement controller:", error);
    if (error.message === "Course requirement not found") {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

// ============================================================================
// GET LEARNER PROGRESS
// ============================================================================

exports.getLearnerProgress = async (req, res, next) => {
  try {
    const certificationId = req.query.certification_id || null;
    const status = req.query.status || null;
    const search = req.query.search || null;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    console.log("getLearnerProgress called with:", { certificationId, status, search, page, limit });

    const result = await certificationService.getLearnerProgress(
      certificationId,
      status,
      search,
      page,
      limit
    );

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Error in getLearnerProgress controller:", error);
    next(error);
  }
};

// ============================================================================
// GET EXPIRY & RENEWALS
// ============================================================================

exports.getExpiryRenewals = async (req, res, next) => {
  try {
    const filter = req.query.filter || 'expiring_soon'; // 'expiring_soon', 'expired', or 'all'
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    console.log("getExpiryRenewals called with:", { filter, page, limit });

    const result = await certificationService.getExpiryRenewals(
      filter,
      page,
      limit
    );

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Error in getExpiryRenewals controller:", error);
    next(error);
  }
};

// ============================================================================
// ENROLL STUDENT IN CERTIFICATION
// ============================================================================

exports.enrollStudent = async (req, res, next) => {
  try {
    const { certification_id, user_id } = req.body;

    console.log("enrollStudent called with:", { certification_id, user_id });

    if (!certification_id || !user_id) {
      return res.status(400).json({
        success: false,
        message: "certification_id and user_id are required",
      });
    }

    const result = await certificationService.enrollStudent(
      certification_id,
      user_id,
      req.user.uuid
    );

    res.status(201).json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Error in enrollStudent controller:", error);
    if (error.message.includes("already enrolled")) {
      return res.status(409).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

// ============================================================================
// ISSUE CERTIFICATE (CHECK REQUIREMENTS AND ISSUE)
// ============================================================================

exports.issueCertificate = async (req, res, next) => {
  try {
    const enrollmentId = req.params.enrollmentId;

    console.log("issueCertificate called for enrollment ID:", enrollmentId);

    const result = await certificationService.checkAndIssueCertificate(enrollmentId);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error("Error in issueCertificate controller:", error);
    if (error.message === "Enrollment not found") {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};
