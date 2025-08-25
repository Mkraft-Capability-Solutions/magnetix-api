const userService = require("../services/user_service");
const Joi = require("joi");

// Validation schemas
const updateDetailsSchema = Joi.object({
  first_name: Joi.string().optional(),
  last_name: Joi.string().optional(),
  contact: Joi.string().optional().allow(""),
  gender: Joi.string().valid("male", "female", "other").optional(),
  dob: Joi.date().optional(),
  address: Joi.string().optional().allow(""),
  specialization: Joi.string().optional().allow(""),
  expertise: Joi.string().optional().allow(""),
  city: Joi.string().optional().allow(""),
  state: Joi.string().optional().allow(""),
  country: Joi.string().optional().allow(""),
  social_links: Joi.object().optional(),
  about: Joi.string().optional().allow(""),
  resume_url: Joi.string().optional().allow(""),
  profile_visibility: Joi.string().valid("public", "private").optional(),
});

const updatePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string()
    .min(8)
    .required()
    .invalid(Joi.ref("currentPassword"))
    .messages({
      "any.invalid": "New password must be different from current password",
    }),
});

exports.getUser = async (req, res, next) => {
  try {
    const { uuid } = req.params;
    const user = await userService.getUser(uuid);
    res.json(user); // returns full UserDTO
  } catch (error) {
    next(error);
  }
};

exports.updateUserDetails = async (req, res, next) => {
  try {
    // Validate request body
    const { error } = updateDetailsSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { uuid } = req.params;
    const updatedUser = await userService.updateUserDetails(uuid, req.body);
    res.json(updatedUser);
  } catch (error) {
    next(error);
  }
};

exports.deleteUser = async (req, res, next) => {
  try {
    const { uuid } = req.params;
    await userService.deleteUser(uuid);
    res.json({
      message: "User deactivated and marked as deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

exports.updateUserPassword = async (req, res, next) => {
  try {
    // Validate request body
    const { error } = updatePasswordSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { uuid } = req.params;
    const { currentPassword, newPassword } = req.body;

    await userService.updateUserPassword(uuid, currentPassword, newPassword);
    res.json({ message: "Password updated successfully" });
  } catch (error) {
    next(error);
  }
};

exports.uploadUserProfilePicture = async (req, res, next) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "No file uploaded" });
    }

    // Just return the filename (not full path)
    const filename = req.file.filename;
    await userService.updateProfilePicture(req.params.uuid, filename);
    res.json({
      success: true,
      message: "Profile picture uploaded successfully",
      filename,
    });
  } catch (error) {
    next(error);
  }
};
