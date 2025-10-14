// instructor_availability_controller.js
const instructorAvailabilityService = require('../../services/instructor/availability_service');
const Joi = require('joi');

// Validation schemas
const updateAvailabilitySchema = Joi.object({
    availableDays: Joi.array()
        .items(Joi.string().valid('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'))
        .min(1)
        .required()
        .messages({
            'array.min': 'At least one day must be selected',
            'any.required': 'Available days are required'
        }),
    startTime: Joi.string()
        .pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
        .required()
        .messages({
            'string.pattern.base': 'Start time must be in HH:mm format (e.g., 09:00)',
            'any.required': 'Start time is required'
        }),
    endTime: Joi.string()
        .pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
        .required()
        .messages({
            'string.pattern.base': 'End time must be in HH:mm format (e.g., 17:00)',
            'any.required': 'End time is required'
        }),
    timezone: Joi.string()
        .optional()
        .default('UTC'),
    isActive: Joi.boolean()
        .optional()
        .default(true)
}).custom((value, helpers) => {
    // Custom validation to ensure end time is after start time
    const [startHour, startMin] = value.startTime.split(':').map(Number);
    const [endHour, endMin] = value.endTime.split(':').map(Number);

    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    if (endMinutes <= startMinutes) {
        return helpers.error('custom.endTimeAfterStart');
    }

    return value;
}, 'End time validation').messages({
    'custom.endTimeAfterStart': 'End time must be after start time'
});

/**
 * Get instructor availability
 */
exports.getAvailability = async (req, res, next) => {
    try {
        const availability = await instructorAvailabilityService.getAvailability(req.user.uuid);

        res.json({
            success: true,
            data: availability
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Update instructor availability
 */
exports.updateAvailability = async (req, res, next) => {
    try {
        const { error } = updateAvailabilitySchema.validate(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                message: error.details[0].message
            });
        }

        const result = await instructorAvailabilityService.updateAvailability(req.user.uuid, req.body);

        res.json({
            success: true,
            message: result.action === 'created'
                ? 'Availability created successfully'
                : 'Availability updated successfully',
            data: result
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Set instructor as unavailable
 */
exports.setUnavailable = async (req, res, next) => {
    try {
        const result = await instructorAvailabilityService.setUnavailable(req.user.uuid);

        res.json({
            success: true,
            message: 'You have been marked as unavailable',
            data: result
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get instructor availability by UUID (public endpoint for students)
 */
exports.getInstructorAvailabilityByUuid = async (req, res, next) => {
    try {
        const { instructorUuid } = req.params;

        if (!instructorUuid) {
            return res.status(400).json({
                success: false,
                message: 'Instructor UUID is required'
            });
        }

        const availability = await instructorAvailabilityService.getAvailability(instructorUuid);

        res.json({
            success: true,
            data: availability
        });
    } catch (error) {
        next(error);
    }
};
