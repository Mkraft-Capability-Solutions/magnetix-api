const instructorProfileService = require('../../services/instructor/instructor_profile_service');
const Joi = require('joi');

/**
 * Controller for instructor profile operations
 */
class InstructorProfileController {
  /**
   * Get complete instructor profile
   * GET /instructor/profile/:instructorUuid
   * or GET /student/instructor-profile/:instructorUuid
   */
  async getCompleteProfile(req, res, next) {
    try {
      const { instructorUuid } = req.params;

      // Validate UUID format
      const schema = Joi.object({
        instructorUuid: Joi.string().uuid().required()
      });

      const { error } = schema.validate({ instructorUuid });
      if (error) {
        return res.status(400).json({
          success: false,
          error: {
            message: error.details[0].message
          }
        });
      }

      const profile = await instructorProfileService.getCompleteProfile(instructorUuid);

      res.json({
        success: true,
        message: 'Instructor profile retrieved successfully',
        data: profile
      });
    } catch (error) {
      console.error('Error in getCompleteProfile controller:', error);
      next(error);
    }
  }

  /**
   * Update instructor experience
   * PUT /instructor/profile/experience
   */
  async updateExperience(req, res, next) {
    try {
      const instructorUuid = req.user.uuid;
      const { experience } = req.body;

      // Validate experience array
      const experienceSchema = Joi.object({
        company: Joi.string().required(),
        role: Joi.string().required(),
        startDate: Joi.string().required(), // Format: YYYY-MM or YYYY-MM-DD
        endDate: Joi.string().allow('', null).optional(), // Empty string for "Present"
        description: Joi.string().allow('').optional(),
        location: Joi.string().allow('').optional()
      });

      const schema = Joi.object({
        experience: Joi.array().items(experienceSchema).required()
      });

      const { error } = schema.validate({ experience });
      if (error) {
        return res.status(400).json({
          success: false,
          error: {
            message: error.details[0].message
          }
        });
      }

      await instructorProfileService.updateExperience(instructorUuid, experience);

      res.json({
        success: true,
        message: 'Experience updated successfully'
      });
    } catch (error) {
      console.error('Error in updateExperience controller:', error);
      next(error);
    }
  }

  /**
   * Get instructor basic info
   * GET /instructor/profile/basic/:instructorUuid
   */
  async getBasicInfo(req, res, next) {
    try {
      const { instructorUuid } = req.params;

      // Validate UUID format
      const schema = Joi.object({
        instructorUuid: Joi.string().uuid().required()
      });

      const { error } = schema.validate({ instructorUuid });
      if (error) {
        return res.status(400).json({
          success: false,
          error: {
            message: error.details[0].message
          }
        });
      }

      const basicInfo = await instructorProfileService.getBasicInfo(instructorUuid);

      res.json({
        success: true,
        message: 'Instructor basic info retrieved successfully',
        data: basicInfo
      });
    } catch (error) {
      console.error('Error in getBasicInfo controller:', error);
      next(error);
    }
  }

  /**
   * Get own instructor profile (for instructors viewing their own profile)
   * GET /instructor/profile
   */
  async getOwnProfile(req, res, next) {
    try {
      const instructorUuid = req.user.uuid;

      const profile = await instructorProfileService.getCompleteProfile(instructorUuid);

      res.json({
        success: true,
        message: 'Your profile retrieved successfully',
        data: profile
      });
    } catch (error) {
      console.error('Error in getOwnProfile controller:', error);
      next(error);
    }
  }
}

module.exports = new InstructorProfileController();
