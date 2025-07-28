const Joi = require('joi');
const notificationService = require('../services/notification_permission_service');

// Validation Schema
const permissionSchema = Joi.object({
  user_id: Joi.string().guid().required(),
  permission_id: Joi.number().integer().required()
});

exports.addPermission = async (req, res, next) => {
  try {
    const { error } = permissionSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.message });

    const result = await notificationService.addPermission(req.body.user_id, req.body.permission_id);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

exports.removePermission = async (req, res, next) => {
  try {
    const { error } = permissionSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.message });

    const result = await notificationService.removePermission(req.body.user_id, req.body.permission_id);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

exports.getUserPermissions = async (req, res, next) => {
  try {
    const { user_id } = req.params;
    const data = await notificationService.getUserPermissions(user_id);
    res.status(200).json(data);
  } catch (err) {
    next(err);
  }
};

exports.getAllPermissions = async (_req, res, next) => {
  try {
    const data = await notificationService.getAllPermissions();
    res.status(200).json(data);
  } catch (err) {
    next(err);
  }
};
