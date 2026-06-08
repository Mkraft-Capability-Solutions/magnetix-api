const service = require('../../services/super_admin/content_governance_service');

/**
 * Content Governance Controller — taxonomy, course lifecycle queue, structure
 * tree and lifecycle transitions. Super-admin gated at the router level.
 *
 * Taxonomy CRUD delegates to CatalogService (which throws on conflicts); we
 * translate thrown messages into 400s so the UI shows the real reason.
 */

// ------------------------------------------------------------ Taxonomy

const getTaxonomy = async (req, res, next) => {
  try {
    const data = await service.getTaxonomy();
    res.status(200).json({ success: true, data });
  } catch (error) { next(error); }
};

const createCategory = async (req, res, next) => {
  try {
    const { name, description } = req.body || {};
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Category name is required' });
    }
    const data = await service.addCategory(name.trim(), description, req.user.uuid);
    res.status(201).json({ success: true, message: 'Category created', data });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

const updateCategory = async (req, res, next) => {
  try {
    const { name, description } = req.body || {};
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Category name is required' });
    }
    const data = await service.updateCategory(req.params.id, name.trim(), description, req.user.uuid);
    res.status(200).json({ success: true, message: 'Category updated', data });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

const deleteCategory = async (req, res, next) => {
  try {
    const data = await service.deleteCategory(req.params.id);
    res.status(200).json({ success: true, ...data });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

const createSubcategory = async (req, res, next) => {
  try {
    const { categoryId, name, description } = req.body || {};
    if (!categoryId) {
      return res.status(400).json({ success: false, message: 'categoryId is required' });
    }
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Subcategory name is required' });
    }
    const data = await service.addSubcategory(categoryId, name.trim(), description, req.user.uuid);
    res.status(201).json({ success: true, message: 'Subcategory created', data });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

const updateSubcategory = async (req, res, next) => {
  try {
    const { name, description } = req.body || {};
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Subcategory name is required' });
    }
    const data = await service.updateSubcategory(req.params.id, name.trim(), description, req.user.uuid);
    res.status(200).json({ success: true, message: 'Subcategory updated', data });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

const deleteSubcategory = async (req, res, next) => {
  try {
    const data = await service.deleteSubcategory(req.params.id);
    res.status(200).json({ success: true, ...data });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

// -------------------------------------------------------------- Courses

const getCourses = async (req, res, next) => {
  try {
    const data = await service.getCourses({ status: req.query.status });
    res.status(200).json({ success: true, data: data.courses, countsByStatus: data.countsByStatus });
  } catch (error) { next(error); }
};

const getCourseStructure = async (req, res, next) => {
  try {
    const data = await service.getCourseStructure(req.params.id);
    if (!data) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }
    res.status(200).json({ success: true, data });
  } catch (error) { next(error); }
};

const getCourseHistory = async (req, res, next) => {
  try {
    const data = await service.getCourseHistory(req.params.id);
    res.status(200).json({ success: true, data });
  } catch (error) { next(error); }
};

const transitionLifecycle = async (req, res, next) => {
  try {
    const { action, note } = req.body || {};
    const result = await service.transitionLifecycle(req.params.id, action, note, req.user.uuid);
    if (!result.success) {
      return res.status(result.status || 400).json(result);
    }
    res.status(200).json(result);
  } catch (error) { next(error); }
};

module.exports = {
  getTaxonomy,
  createCategory,
  updateCategory,
  deleteCategory,
  createSubcategory,
  updateSubcategory,
  deleteSubcategory,
  getCourses,
  getCourseStructure,
  getCourseHistory,
  transitionLifecycle
};
