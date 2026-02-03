const userCertificateService = require("../../services/admin/user_certificate_service");
const Joi = require("joi");

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const issueCertificateSchema = Joi.object({
  certificate_name: Joi.string().required().min(3).max(255),
  user_id: Joi.string().required(),
  description: Joi.string().allow("", null).optional(),
  issue_date: Joi.date().optional(),
  expiry_date: Joi.date().allow(null).optional(),
  template_id: Joi.number().integer().allow(null).optional(),
  notes: Joi.string().allow("", null).optional(),
});

// ============================================================================
// ISSUE CERTIFICATE TO USER
// ============================================================================

exports.issueCertificateToUser = async (req, res, next) => {
  try {
    console.log("issueCertificateToUser called with body:", JSON.stringify(req.body, null, 2));

    const { error } = issueCertificateSchema.validate(req.body, { abortEarly: false });
    if (error) {
      console.log("Validation errors:", error.details.map((detail) => detail.message));
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        details: error.details.map((detail) => detail.message),
      });
    }

    const result = await userCertificateService.issueCertificateToUser(
      req.body,
      req.user.uuid
    );

    res.status(201).json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Error in issueCertificateToUser controller:", error);
    next(error);
  }
};

// ============================================================================
// GET ALL ISSUED CERTIFICATES
// ============================================================================

exports.getAllIssuedCertificates = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status || null;
    const search = req.query.search || null;

    console.log("getAllIssuedCertificates called with params:", { page, limit, status, search });

    const result = await userCertificateService.getAllIssuedCertificates(
      page,
      limit,
      { status, search }
    );

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Error in getAllIssuedCertificates controller:", error);
    next(error);
  }
};

// ============================================================================
// GET CERTIFICATE BY ID
// ============================================================================

exports.getCertificateById = async (req, res, next) => {
  try {
    const certificateId = req.params.id;
    console.log("getCertificateById called for ID:", certificateId);

    const result = await userCertificateService.getCertificateById(certificateId);

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Error in getCertificateById controller:", error);
    if (error.message === "Certificate not found") {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

// ============================================================================
// DELETE CERTIFICATE
// ============================================================================

exports.deleteCertificate = async (req, res, next) => {
  try {
    const certificateId = req.params.id;
    console.log("deleteCertificate called for ID:", certificateId);

    const result = await userCertificateService.deleteCertificate(certificateId);

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Error in deleteCertificate controller:", error);
    if (error.message === "Certificate not found") {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

// ============================================================================
// REVOKE CERTIFICATE
// ============================================================================

exports.revokeCertificate = async (req, res, next) => {
  try {
    const certificateId = req.params.id;
    const { reason } = req.body;

    console.log("revokeCertificate called for ID:", certificateId);

    const result = await userCertificateService.revokeCertificate(certificateId, reason);

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Error in revokeCertificate controller:", error);
    if (error.message === "Certificate not found") {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

// ============================================================================
// GET CERTIFICATE TEMPLATES
// ============================================================================

exports.getCertificateTemplates = async (req, res, next) => {
  try {
    console.log("getCertificateTemplates called");

    const result = await userCertificateService.getCertificateTemplates();

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Error in getCertificateTemplates controller:", error);
    next(error);
  }
};

// ============================================================================
// SEARCH USERS
// ============================================================================

exports.searchUsers = async (req, res, next) => {
  try {
    const search = req.query.search || "";
    const limit = parseInt(req.query.limit) || 20;

    console.log("searchUsers called with search:", search);

    const result = await userCertificateService.searchUsers(search, limit);

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Error in searchUsers controller:", error);
    next(error);
  }
};

// ============================================================================
// GET USER CERTIFICATES (FOR STUDENT VIEW)
// ============================================================================

exports.getUserCertificates = async (req, res, next) => {
  try {
    const userId = req.user.uuid; // Current logged-in user

    console.log("getUserCertificates called for user:", userId);

    const result = await userCertificateService.getUserCertificates(userId);

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Error in getUserCertificates controller:", error);
    next(error);
  }
};
