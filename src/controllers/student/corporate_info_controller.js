const corporateInfoService = require('../../services/student/corporate_info_service');
const Joi = require('joi');

// Validation schema for corporate info
const corporateInfoSchema = Joi.object({
  job_profile: Joi.string().optional().allow(''),
  designation: Joi.string().optional().allow(''),
  department: Joi.string().optional().allow(''),
  employee_id: Joi.string().optional().allow(''),
  organization_name: Joi.string().optional().allow(''),
  location: Joi.string().optional().allow(''),
  manager_name: Joi.string().optional().allow(''),
  manager_email: Joi.string().email().optional().allow(''),
  manager_contact: Joi.string().optional().allow('')
});

/**
 * Get corporate information for the authenticated student
 */
exports.getCorporateInfo = async (req, res, next) => {
  try {
    const userId = req.user.uuid;

    const corporateInfo = await corporateInfoService.getCorporateInfo(userId);

    if (!corporateInfo) {
      return res.json({
        success: true,
        data: null,
        message: 'No corporate information found'
      });
    }

    res.json({
      success: true,
      data: corporateInfo
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create or update corporate information for the authenticated student
 */
exports.updateCorporateInfo = async (req, res, next) => {
  try {
    // Validate request body
    const { error } = corporateInfoSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const userId = req.user.uuid;

    const corporateInfo = await corporateInfoService.updateCorporateInfo(userId, req.body);

    res.json({
      success: true,
      data: corporateInfo,
      message: 'Corporate information saved successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete corporate information for the authenticated student
 */
exports.deleteCorporateInfo = async (req, res, next) => {
  try {
    const userId = req.user.uuid;

    const result = await corporateInfoService.deleteCorporateInfo(userId);

    res.json({
      success: true,
      message: 'Corporate information deleted successfully',
      deletedRows: result.deletedRows
    });
  } catch (error) {
    next(error);
  }
};
