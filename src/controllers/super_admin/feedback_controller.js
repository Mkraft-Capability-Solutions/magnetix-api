const feedbackService = require('../../services/super_admin/feedback_service');

// ===== SUPER ADMIN ENDPOINTS =====

/**
 * Get all feedback forms
 * GET /api/super-admin/feedback/forms
 */
exports.getAllForms = async (req, res) => {
  try {
    const { status, type, search } = req.query;
    const forms = await feedbackService.getAllForms({ status, type, search });

    res.json({
      success: true,
      data: forms
    });
  } catch (error) {
    console.error('Super Admin Feedback Controller - getAllForms error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch forms',
      error: error.message
    });
  }
};

/**
 * Get form by ID
 * GET /api/super-admin/feedback/forms/:id
 */
exports.getFormById = async (req, res) => {
  try {
    const { id } = req.params;
    const form = await feedbackService.getFormById(id);

    if (!form) {
      return res.status(404).json({
        success: false,
        message: 'Form not found'
      });
    }

    res.json({
      success: true,
      data: form
    });
  } catch (error) {
    console.error('Super Admin Feedback Controller - getFormById error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch form',
      error: error.message
    });
  }
};

/**
 * Create new form
 * POST /api/super-admin/feedback/forms
 */
exports.createForm = async (req, res) => {
  try {
    const result = await feedbackService.createForm(req.body, req.user.uuid);

    res.status(201).json({
      success: true,
      data: result,
      message: 'Form created successfully'
    });
  } catch (error) {
    console.error('Super Admin Feedback Controller - createForm error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create form',
      error: error.message
    });
  }
};

/**
 * Update form
 * PUT /api/super-admin/feedback/forms/:id
 */
exports.updateForm = async (req, res) => {
  try {
    const { id } = req.params;
    await feedbackService.updateForm(id, req.body);

    res.json({
      success: true,
      message: 'Form updated successfully'
    });
  } catch (error) {
    console.error('Super Admin Feedback Controller - updateForm error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update form',
      error: error.message
    });
  }
};

/**
 * Delete form
 * DELETE /api/super-admin/feedback/forms/:id
 */
exports.deleteForm = async (req, res) => {
  try {
    const { id } = req.params;
    await feedbackService.deleteForm(id);

    res.json({
      success: true,
      message: 'Form deleted successfully'
    });
  } catch (error) {
    console.error('Super Admin Feedback Controller - deleteForm error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete form',
      error: error.message
    });
  }
};

/**
 * Get form analytics
 * GET /api/super-admin/feedback/forms/:id/analytics
 */
exports.getFormAnalytics = async (req, res) => {
  try {
    const { id } = req.params;
    const analytics = await feedbackService.getFormAnalytics(id);

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Super Admin Feedback Controller - getFormAnalytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics',
      error: error.message
    });
  }
};

/**
 * Get form responses for export
 * GET /api/super-admin/feedback/forms/:id/responses
 */
exports.getFormResponses = async (req, res) => {
  try {
    const { id } = req.params;
    const responses = await feedbackService.getFormResponses(id);

    res.json({
      success: true,
      data: responses
    });
  } catch (error) {
    console.error('Super Admin Feedback Controller - getFormResponses error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch responses',
      error: error.message
    });
  }
};
