const aiLearningPathService = require('../../services/student/ai_learning_path_service');
const geminiAIService = require('../../services/gemini/gemini_ai_service');
const Joi = require('joi');

// Validation schema for generate request
const generateLearningPathSchema = Joi.object({
  prompt: Joi.string()
    .min(10)
    .max(1000)
    .required()
    .messages({
      'string.min': 'Please provide a more detailed learning goal (at least 10 characters)',
      'string.max': 'Learning goal is too long (max 1000 characters)',
      'any.required': 'Learning goal description is required'
    })
});

// Validation schema for save request (extended with linked_courses and external_resources)
const saveLearningPathSchema = Joi.object({
  learningPath: Joi.object({
    title: Joi.string().required(),
    description: Joi.string().required(),
    difficulty_level: Joi.string().valid('beginner', 'intermediate', 'advanced').required(),
    estimated_duration_weeks: Joi.number().integer().min(1).required(),
    total_modules: Joi.number().integer().optional(), // Allow but don't require
    modules: Joi.array().items(
      Joi.object({
        module_order: Joi.number().integer().min(1).required(),
        title: Joi.string().required(),
        description: Joi.string().allow(''),
        duration_weeks: Joi.number().integer().min(1).required(),
        topics: Joi.array().items(Joi.string()).min(1).required(),
        linked_courses: Joi.array().items(
          Joi.object({
            course_id: Joi.number().integer().required()
          })
        ).optional().default([]),
        external_resources: Joi.array().items(
          Joi.object({
            title: Joi.string().required(),
            platform: Joi.string().required(),
            url: Joi.string().uri().required(),
            description: Joi.string().allow('').optional(),
            estimated_duration: Joi.string().allow('').optional(),
            is_free: Joi.boolean().optional().default(true)
          })
        ).optional().default([])
      })
    ).min(1).required()
  }).required()
});

// Validation schema for search platform courses
const searchPlatformCoursesSchema = Joi.object({
  topics: Joi.array().items(Joi.string()).min(1).required(),
  module_title: Joi.string().required(),
  difficulty_level: Joi.string().valid('beginner', 'intermediate', 'advanced').optional()
});

// Validation schema for suggest external courses
const suggestExternalCoursesSchema = Joi.object({
  topics: Joi.array().items(Joi.string()).min(1).required(),
  module_title: Joi.string().required(),
  module_description: Joi.string().allow('').optional(),
  difficulty_level: Joi.string().valid('beginner', 'intermediate', 'advanced').required()
});

/**
 * Get all learning paths for the authenticated user
 * GET /api/student/ai-learning-path/learning-paths
 */
exports.getUserLearningPaths = async (req, res, next) => {
  try {
    const response = await aiLearningPathService.getUserLearningPaths(req.user.uuid);
    if (!response.success) {
      return res.status(response.error.status || 500).json(response);
    }
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Get detailed information about a specific learning path
 * GET /api/student/ai-learning-path/learning-paths/:pathId
 */
exports.getLearningPathDetail = async (req, res, next) => {
  try {
    const { pathId } = req.params;
    const response = await aiLearningPathService.getLearningPathDetail(pathId, req.user.uuid);
    if (!response.success) {
      return res.status(response.error.status || 404).json(response);
    }
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Get progress data for Progress tab (Tab 2)
 * GET /api/student/ai-learning-path/progress
 */
exports.getProgressData = async (req, res, next) => {
  try {
    const response = await aiLearningPathService.getProgressData(req.user.uuid);
    if (!response.success) {
      return res.status(response.error.status || 500).json(response);
    }
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Get statistics data for Statistics tab (Tab 3)
 * GET /api/student/ai-learning-path/statistics
 */
exports.getStatisticsData = async (req, res, next) => {
  try {
    const response = await aiLearningPathService.getStatisticsData(req.user.uuid);
    if (!response.success) {
      return res.status(response.error.status || 500).json(response);
    }
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Add a new skill to track
 * POST /api/student/ai-learning-path/skills
 */
exports.addSkill = async (req, res, next) => {
  try {
    const response = await aiLearningPathService.addSkill(req.user.uuid, req.body);
    if (!response.success) {
      return res.status(response.error.status || 500).json(response);
    }
    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Update an existing skill
 * PUT /api/student/ai-learning-path/skills/:skillId
 */
exports.updateSkill = async (req, res, next) => {
  try {
    const { skillId } = req.params;
    const response = await aiLearningPathService.updateSkill(req.user.uuid, skillId, req.body);
    if (!response.success) {
      return res.status(response.error.status || 500).json(response);
    }
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a skill
 * DELETE /api/student/ai-learning-path/skills/:skillId
 */
exports.deleteSkill = async (req, res, next) => {
  try {
    const { skillId } = req.params;
    const response = await aiLearningPathService.deleteSkill(req.user.uuid, skillId);
    if (!response.success) {
      return res.status(response.error.status || 500).json(response);
    }
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Search trainees by name or email (for sharing learning paths)
 * GET /api/student/ai-learning-path/trainees/search?q=searchQuery
 */
exports.searchTrainees = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters'
      });
    }
    const response = await aiLearningPathService.searchTrainees(req.user.uuid, q.trim());
    if (!response.success) {
      return res.status(response.error.status || 500).json(response);
    }
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Share (copy) a learning path to another trainee
 * POST /api/student/ai-learning-path/learning-paths/:pathId/share
 * Body: { toUserId: string }
 */
exports.shareLearningPath = async (req, res, next) => {
  try {
    const { pathId } = req.params;
    const { toUserId } = req.body;

    if (!toUserId) {
      return res.status(400).json({
        success: false,
        message: 'toUserId is required'
      });
    }

    if (toUserId === req.user.uuid) {
      return res.status(400).json({
        success: false,
        message: 'Cannot share learning path with yourself'
      });
    }

    const response = await aiLearningPathService.shareLearningPath(pathId, req.user.uuid, toUserId);
    if (!response.success) {
      return res.status(response.error.status || 500).json(response);
    }
    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Mark a module as complete
 * POST /api/student/ai-learning-path/learning-paths/:pathId/modules/:moduleId/complete
 * Body: { score?: number }
 */
exports.markModuleComplete = async (req, res, next) => {
  try {
    const { pathId, moduleId } = req.params;
    const { score } = req.body;

    // Validate pathId and moduleId
    if (!pathId || isNaN(Number(pathId))) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid learning path ID',
          code: 'INVALID_PATH_ID'
        }
      });
    }

    if (!moduleId || isNaN(Number(moduleId))) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid module ID',
          code: 'INVALID_MODULE_ID'
        }
      });
    }

    // Validate score if provided
    if (score !== undefined && (typeof score !== 'number' || score < 0 || score > 100)) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Score must be a number between 0 and 100',
          code: 'INVALID_SCORE'
        }
      });
    }

    const response = await aiLearningPathService.markModuleComplete(
      Number(pathId),
      Number(moduleId),
      req.user.uuid,
      score || null
    );

    if (!response.success) {
      return res.status(response.error.status || 500).json(response);
    }

    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Generate a learning path using AI (Gemini)
 * POST /api/student/ai-learning-path/generate
 * Body: { prompt: string }
 */
exports.generateLearningPath = async (req, res, next) => {
  try {
    // Validate request body
    const { error, value } = generateLearningPathSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          message: error.details[0].message,
          code: 'INVALID_PROMPT'
        }
      });
    }

    const { prompt } = value;

    // Generate learning path using Gemini AI
    const learningPath = await geminiAIService.generateLearningPath(prompt);

    res.json({
      success: true,
      data: learningPath,
      message: 'Learning path generated successfully. Click Save to add to your paths.'
    });
  } catch (error) {
    console.error('Generate Learning Path Error:', error);

    // Handle specific error types
    if (error.message.startsWith('CONTENT_FILTERED:')) {
      return res.status(400).json({
        success: false,
        error: {
          message: error.message.replace('CONTENT_FILTERED: ', ''),
          code: 'CONTENT_FILTERED'
        }
      });
    }

    if (error.message.startsWith('PARSE_ERROR:')) {
      return res.status(500).json({
        success: false,
        error: {
          message: 'Failed to generate learning path. Please try again.',
          code: 'PARSE_ERROR'
        }
      });
    }

    if (error.message.includes('configuration is incomplete') || error.message.includes('GEMINI_API_KEY')) {
      return res.status(503).json({
        success: false,
        error: {
          message: 'AI service is not configured. Please contact support.',
          code: 'AI_NOT_CONFIGURED'
        }
      });
    }

    // Generic AI service error
    res.status(503).json({
      success: false,
      error: {
        message: 'AI service temporarily unavailable. Please try again later.',
        code: 'AI_SERVICE_ERROR'
      }
    });
  }
};

/**
 * Save a generated learning path to the database
 * POST /api/student/ai-learning-path/save
 * Body: { learningPath: GeneratedLearningPath }
 */
exports.saveLearningPath = async (req, res, next) => {
  try {
    // Validate request body
    const { error, value } = saveLearningPathSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          message: error.details[0].message,
          code: 'VALIDATION_ERROR'
        }
      });
    }

    const { learningPath } = value;

    // Save to database
    const response = await aiLearningPathService.saveGeneratedLearningPath(req.user.uuid, learningPath);

    if (!response.success) {
      return res.status(response.error.status || 500).json(response);
    }

    res.status(201).json(response);
  } catch (error) {
    console.error('Save Learning Path Error:', error);
    next(error);
  }
};

/**
 * Search platform courses matching module topics
 * POST /api/student/ai-learning-path/search-platform-courses
 * Body: { topics: string[], module_title: string, difficulty_level?: string }
 */
exports.searchPlatformCourses = async (req, res, next) => {
  try {
    const { error, value } = searchPlatformCoursesSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          message: error.details[0].message,
          code: 'VALIDATION_ERROR'
        }
      });
    }

    const { topics, module_title, difficulty_level } = value;
    const response = await aiLearningPathService.searchPlatformCourses(topics, module_title, difficulty_level);

    if (!response.success) {
      return res.status(response.error.status || 500).json(response);
    }

    res.json(response);
  } catch (error) {
    console.error('Search Platform Courses Error:', error);
    next(error);
  }
};

/**
 * Suggest external courses from the internet using AI
 * POST /api/student/ai-learning-path/suggest-external-courses
 * Body: { topics: string[], module_title: string, module_description?: string, difficulty_level: string }
 */
exports.suggestExternalCourses = async (req, res, next) => {
  try {
    const { error, value } = suggestExternalCoursesSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          message: error.details[0].message,
          code: 'VALIDATION_ERROR'
        }
      });
    }

    const { topics, module_title, module_description, difficulty_level } = value;
    const suggestions = await geminiAIService.suggestExternalCourses(
      module_title,
      module_description || '',
      topics,
      difficulty_level
    );

    res.json({
      success: true,
      data: suggestions,
      message: 'External course suggestions generated successfully'
    });
  } catch (error) {
    console.error('Suggest External Courses Error:', error);

    if (error.message.startsWith('CONTENT_FILTERED:')) {
      return res.status(400).json({
        success: false,
        error: {
          message: error.message.replace('CONTENT_FILTERED: ', ''),
          code: 'CONTENT_FILTERED'
        }
      });
    }

    if (error.message.startsWith('PARSE_ERROR:')) {
      return res.status(500).json({
        success: false,
        error: {
          message: 'Failed to generate course suggestions. Please try again.',
          code: 'PARSE_ERROR'
        }
      });
    }

    res.status(503).json({
      success: false,
      error: {
        message: 'AI service temporarily unavailable. Please try again later.',
        code: 'AI_SERVICE_ERROR'
      }
    });
  }
};
