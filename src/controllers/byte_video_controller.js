/**
 * Byte Video controller — thin HTTP layer over byte_video_service.
 * Validates input with Joi and returns the service's standardized responses.
 * Mounted at /api/content/byte-videos for Instructor (2) + SuperAdmin (4).
 */
const Joi = require('joi');
const byteVideoService = require('../services/byte_video/byte_video_service');

const createSchema = Joi.object({
  command: Joi.string().min(5).max(1000).required().messages({
    'string.min': 'Please describe the video in a bit more detail (at least 5 characters)',
    'string.max': 'Command is too long (max 1000 characters)',
    'any.required': 'A command describing the video is required',
  }),
  title: Joi.string().max(200).allow('').optional(),
  voiceId: Joi.string().max(64).allow('', null).optional(),
});

const createLessonSchema = Joi.object({
  title: Joi.string().max(200).allow('').optional(),
});

function sendService(res, response) {
  if (!response.success) {
    return res.status(response.error.status || 500).json(response);
  }
  return res.json(response);
}

exports.createByteVideo = async (req, res, next) => {
  try {
    const { error, value } = createSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: { message: error.details[0].message, code: 'VALIDATION_ERROR', status: 400 },
      });
    }
    const response = await byteVideoService.createJob(req.user.uuid, req.user.role_id, value);
    return sendService(res, response);
  } catch (err) {
    next(err);
  }
};

exports.listVoices = async (req, res, next) => {
  try {
    const response = await byteVideoService.listVoices();
    return sendService(res, response);
  } catch (err) {
    next(err);
  }
};

exports.listByteVideos = async (req, res, next) => {
  try {
    const response = await byteVideoService.listByUser(req.user.uuid);
    return sendService(res, response);
  } catch (err) {
    next(err);
  }
};

exports.getByteVideo = async (req, res, next) => {
  try {
    const response = await byteVideoService.getById(req.params.id, req.user.uuid);
    return sendService(res, response);
  } catch (err) {
    next(err);
  }
};

exports.deleteByteVideo = async (req, res, next) => {
  try {
    const response = await byteVideoService.deleteJob(req.params.id, req.user.uuid);
    return sendService(res, response);
  } catch (err) {
    next(err);
  }
};

exports.createLessonFromByteVideo = async (req, res, next) => {
  try {
    const { error, value } = createLessonSchema.validate(req.body || {});
    if (error) {
      return res.status(400).json({
        success: false,
        error: { message: error.details[0].message, code: 'VALIDATION_ERROR', status: 400 },
      });
    }
    const response = await byteVideoService.createLessonFromByteVideo(req.params.id, req.user.uuid, value);
    return sendService(res, response);
  } catch (err) {
    next(err);
  }
};
