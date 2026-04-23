const organizationService = require('../../services/admin/organization_service');

/**
 * Organization Controller
 * Handles HTTP request/response for organization management
 */

/**
 * Get all organizations
 * GET /admin/organizations
 */
const getAllOrganizations = async (req, res, next) => {
  try {
    const { search, isActive, page, limit } = req.query;

    const result = await organizationService.getAllOrganizations({
      search,
      isActive,
      page,
      limit
    });

    res.status(200).json({
      success: true,
      message: 'Organizations retrieved successfully',
      data: result.organizations,
      pagination: result.pagination
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get organization by ID
 * GET /admin/organizations/:id
 */
const getOrganizationById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const organization = await organizationService.getOrganizationById(id);

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Organization retrieved successfully',
      data: organization
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new organization
 * POST /admin/organizations
 */
const createOrganization = async (req, res, next) => {
  try {
    const { name, isActive } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Organization name is required'
      });
    }

    const result = await organizationService.createOrganization({
      name: name.trim(),
      isActive
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Update an organization
 * PUT /admin/organizations/:id
 */
const updateOrganization = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, isActive } = req.body;

    const result = await organizationService.updateOrganization(id, {
      name: name ? name.trim() : undefined,
      isActive
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Delete an organization
 * DELETE /admin/organizations/:id
 */
const deleteOrganization = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await organizationService.deleteOrganization(id);

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Toggle organization status
 * PATCH /admin/organizations/:id/toggle-status
 */
const toggleOrganizationStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (isActive === undefined) {
      return res.status(400).json({
        success: false,
        message: 'isActive field is required'
      });
    }

    const result = await organizationService.toggleOrganizationStatus(id, isActive);

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Get users in an organization
 * GET /admin/organizations/:id/users
 */
const getOrganizationUsers = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { page, limit } = req.query;

    const result = await organizationService.getOrganizationUsers(id, {
      page,
      limit
    });

    res.status(200).json({
      success: true,
      message: 'Organization users retrieved successfully',
      data: result.users,
      pagination: result.pagination
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Assign user to organization
 * POST /admin/users/:userId/organizations/:organizationId
 */
const assignUserToOrganization = async (req, res, next) => {
  try {
    const { userId, organizationId } = req.params;

    const result = await organizationService.assignUserToOrganization(userId, organizationId);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Remove user from organization
 * DELETE /admin/users/:userId/organizations/:organizationId
 */
const removeUserFromOrganization = async (req, res, next) => {
  try {
    const { userId, organizationId } = req.params;

    const result = await organizationService.removeUserFromOrganization(userId, organizationId);

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Get user's organizations
 * GET /admin/users/:userId/organizations
 */
const getUserOrganizations = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const organizations = await organizationService.getUserOrganizations(userId);

    res.status(200).json({
      success: true,
      message: 'User organizations retrieved successfully',
      data: organizations
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllOrganizations,
  getOrganizationById,
  createOrganization,
  updateOrganization,
  deleteOrganization,
  toggleOrganizationStatus,
  getOrganizationUsers,
  assignUserToOrganization,
  removeUserFromOrganization,
  getUserOrganizations
};
