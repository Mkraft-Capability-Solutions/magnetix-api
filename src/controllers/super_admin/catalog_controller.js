const CatalogService = require("../../services/admin/catalog_service");
const Joi = require("joi");

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const categorySchema = Joi.object({
  name: Joi.string().required().trim().min(1).max(255),
  description: Joi.string().allow("", null).optional(),
});

const subcategorySchema = Joi.object({
  categoryId: Joi.number().integer().min(1).required(),
  name: Joi.string().required().trim().min(1).max(255),
  description: Joi.string().allow("", null).optional(),
});

// ============================================================================
// GET OPERATIONS
// ============================================================================

/**
 * Get all categories with their subcategories (hierarchical structure)
 * GET /api/admin/catalog/categories
 */
exports.getCategoriesWithSubcategories = async (req, res, next) => {
  try {
    const categories = await CatalogService.getCategoriesWithSubcategories();

    res.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    console.error("Error in getCategoriesWithSubcategories:", error);
    next(error);
  }
};

/**
 * Get all categories (flat list)
 * GET /api/admin/catalog/categories/list
 */
exports.getAllCategories = async (req, res, next) => {
  try {
    const categories = await CatalogService.getAllCategories();

    res.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    console.error("Error in getAllCategories:", error);
    next(error);
  }
};

/**
 * Get category by ID with subcategories
 * GET /api/admin/catalog/categories/:categoryId
 */
exports.getCategoryById = async (req, res, next) => {
  try {
    const categoryId = parseInt(req.params.categoryId);

    if (isNaN(categoryId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID",
      });
    }

    const category = await CatalogService.getCategoryById(categoryId);

    res.json({
      success: true,
      data: category,
    });
  } catch (error) {
    if (error.message === "Category not found") {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }
    console.error("Error in getCategoryById:", error);
    next(error);
  }
};

// ============================================================================
// CATEGORY CRUD OPERATIONS
// ============================================================================

/**
 * Add a new category
 * POST /api/admin/catalog/categories
 * Body: { name: string, description?: string }
 */
exports.addCategory = async (req, res, next) => {
  try {
    const { error, value } = categorySchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        details: error.details.map((detail) => detail.message),
      });
    }

    const { name, description } = value;
    const creatorId = req.user.uuid;

    const newCategory = await CatalogService.addCategory(name, description, creatorId);

    res.status(201).json({
      success: true,
      message: "Category added successfully",
      data: newCategory,
    });
  } catch (error) {
    if (error.message === "Category already exists") {
      return res.status(409).json({
        success: false,
        message: error.message,
      });
    }
    console.error("Error in addCategory:", error);
    next(error);
  }
};

/**
 * Update a category
 * PUT /api/admin/catalog/categories/:categoryId
 * Body: { name: string, description?: string }
 */
exports.updateCategory = async (req, res, next) => {
  try {
    const categoryId = parseInt(req.params.categoryId);

    if (isNaN(categoryId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID",
      });
    }

    const { error, value } = categorySchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        details: error.details.map((detail) => detail.message),
      });
    }

    const { name, description } = value;
    const updatedBy = req.user.uuid;

    const updatedCategory = await CatalogService.updateCategory(
      categoryId,
      name,
      description,
      updatedBy
    );

    res.json({
      success: true,
      message: "Category updated successfully",
      data: updatedCategory,
    });
  } catch (error) {
    if (error.message === "Category not found") {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }
    if (error.message === "Category name already exists") {
      return res.status(409).json({
        success: false,
        message: error.message,
      });
    }
    console.error("Error in updateCategory:", error);
    next(error);
  }
};

/**
 * Delete a category
 * DELETE /api/admin/catalog/categories/:categoryId
 */
exports.deleteCategory = async (req, res, next) => {
  try {
    const categoryId = parseInt(req.params.categoryId);

    if (isNaN(categoryId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID",
      });
    }

    const result = await CatalogService.deleteCategory(categoryId);

    res.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    if (error.message === "Category not found") {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }
    if (error.message.includes("Cannot delete category")) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
    console.error("Error in deleteCategory:", error);
    next(error);
  }
};

// ============================================================================
// SUBCATEGORY CRUD OPERATIONS
// ============================================================================

/**
 * Add a new subcategory
 * POST /api/admin/catalog/subcategories
 * Body: { categoryId: number, name: string, description?: string }
 */
exports.addSubcategory = async (req, res, next) => {
  try {
    const { error, value } = subcategorySchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        details: error.details.map((detail) => detail.message),
      });
    }

    const { categoryId, name, description } = value;
    const creatorId = req.user.uuid;

    const newSubcategory = await CatalogService.addSubcategory(
      categoryId,
      name,
      description,
      creatorId
    );

    res.status(201).json({
      success: true,
      message: "Subcategory added successfully",
      data: newSubcategory,
    });
  } catch (error) {
    if (error.message === "Parent category not found") {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }
    if (error.message === "Subcategory already exists for this category") {
      return res.status(409).json({
        success: false,
        message: error.message,
      });
    }
    console.error("Error in addSubcategory:", error);
    next(error);
  }
};

/**
 * Update a subcategory
 * PUT /api/admin/catalog/subcategories/:subcategoryId
 * Body: { name: string, description?: string }
 */
exports.updateSubcategory = async (req, res, next) => {
  try {
    const subcategoryId = parseInt(req.params.subcategoryId);

    if (isNaN(subcategoryId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid subcategory ID",
      });
    }

    const { error, value } = Joi.object({
      name: Joi.string().required().trim().min(1).max(255),
      description: Joi.string().allow("", null).optional(),
    }).validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        details: error.details.map((detail) => detail.message),
      });
    }

    const { name, description } = value;
    const updatedBy = req.user.uuid;

    const updatedSubcategory = await CatalogService.updateSubcategory(
      subcategoryId,
      name,
      description,
      updatedBy
    );

    res.json({
      success: true,
      message: "Subcategory updated successfully",
      data: updatedSubcategory,
    });
  } catch (error) {
    if (error.message === "Subcategory not found") {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }
    if (error.message === "Subcategory name already exists for this category") {
      return res.status(409).json({
        success: false,
        message: error.message,
      });
    }
    console.error("Error in updateSubcategory:", error);
    next(error);
  }
};

/**
 * Delete a subcategory
 * DELETE /api/admin/catalog/subcategories/:subcategoryId
 */
exports.deleteSubcategory = async (req, res, next) => {
  try {
    const subcategoryId = parseInt(req.params.subcategoryId);

    if (isNaN(subcategoryId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid subcategory ID",
      });
    }

    const result = await CatalogService.deleteSubcategory(subcategoryId);

    res.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    if (error.message === "Subcategory not found") {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }
    if (error.message.includes("Cannot delete subcategory")) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
    console.error("Error in deleteSubcategory:", error);
    next(error);
  }
};

// ============================================================================
// CATALOG COURSES - VIEW OPERATIONS
// ============================================================================

/**
 * Get catalog courses with optional filters
 * GET /api/admin/catalog/courses
 * Query params: categoryId, subcategoryId, level, minDuration, maxDuration, search
 */
exports.getCatalogCourses = async (req, res, next) => {
  try {
    const filters = {
      categoryId: req.query.categoryId ? parseInt(req.query.categoryId) : null,
      subcategoryId: req.query.subcategoryId ? parseInt(req.query.subcategoryId) : null,
      level: req.query.level || null,
      minDuration: req.query.minDuration ? parseInt(req.query.minDuration) : null,
      maxDuration: req.query.maxDuration ? parseInt(req.query.maxDuration) : null,
      search: req.query.search || null,
    };

    const courses = await CatalogService.getCatalogCourses(filters);

    res.json({
      success: true,
      data: courses,
    });
  } catch (error) {
    console.error("Error in getCatalogCourses:", error);
    next(error);
  }
};

// ============================================================================
// FEATURED COURSES OPERATIONS
// ============================================================================

/**
 * Get all featured courses
 * GET /api/admin/catalog/featured-courses
 */
exports.getFeaturedCourses = async (req, res, next) => {
  try {
    const featured = await CatalogService.getFeaturedCourses();

    res.json({
      success: true,
      data: featured,
    });
  } catch (error) {
    console.error("Error in getFeaturedCourses:", error);
    next(error);
  }
};

/**
 * Add a featured course
 * POST /api/admin/catalog/featured-courses
 * Body: { courseId: number }
 */
exports.addFeaturedCourse = async (req, res, next) => {
  try {
    const { courseId } = req.body;

    if (!courseId || isNaN(parseInt(courseId))) {
      return res.status(400).json({
        success: false,
        message: "Valid course ID is required",
      });
    }

    const createdBy = req.user.uuid;
    const result = await CatalogService.addFeaturedCourse(parseInt(courseId), createdBy);

    res.status(201).json({
      success: true,
      message: "Course added to featured list",
      data: result,
    });
  } catch (error) {
    if (error.message === "Course not found or not active") {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }
    if (error.message === "Course is already featured") {
      return res.status(409).json({
        success: false,
        message: error.message,
      });
    }
    console.error("Error in addFeaturedCourse:", error);
    next(error);
  }
};

/**
 * Toggle featured course active status
 * PATCH /api/admin/catalog/featured-courses/:featuredId/toggle
 */
exports.toggleFeaturedCourse = async (req, res, next) => {
  try {
    const featuredId = parseInt(req.params.featuredId);

    if (isNaN(featuredId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid featured course ID",
      });
    }

    const updatedBy = req.user.uuid;
    const result = await CatalogService.toggleFeaturedCourse(featuredId, updatedBy);

    res.json({
      success: true,
      message: "Featured course status updated",
      data: result,
    });
  } catch (error) {
    if (error.message === "Featured course not found") {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }
    console.error("Error in toggleFeaturedCourse:", error);
    next(error);
  }
};

/**
 * Remove a featured course
 * DELETE /api/admin/catalog/featured-courses/:featuredId
 */
exports.removeFeaturedCourse = async (req, res, next) => {
  try {
    const featuredId = parseInt(req.params.featuredId);

    if (isNaN(featuredId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid featured course ID",
      });
    }

    const result = await CatalogService.removeFeaturedCourse(featuredId);

    res.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    if (error.message === "Featured course not found") {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }
    console.error("Error in removeFeaturedCourse:", error);
    next(error);
  }
};

// ============================================================================
// RECOMMENDATION RULES OPERATIONS
// ============================================================================

/**
 * Get all recommendation rules
 * GET /api/admin/catalog/recommendation-rules
 */
exports.getRecommendationRules = async (req, res, next) => {
  try {
    const rules = await CatalogService.getRecommendationRules();

    res.json({
      success: true,
      data: rules,
    });
  } catch (error) {
    console.error("Error in getRecommendationRules:", error);
    next(error);
  }
};

/**
 * Add a new recommendation rule
 * POST /api/admin/catalog/recommendation-rules
 * Body: { name: string, condition: string, courseIds: number[] }
 */
exports.addRecommendationRule = async (req, res, next) => {
  try {
    const { name, condition, courseIds } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Rule name is required",
      });
    }

    if (!condition || !condition.trim()) {
      return res.status(400).json({
        success: false,
        message: "Rule condition is required",
      });
    }

    const createdBy = req.user.uuid;
    const result = await CatalogService.addRecommendationRule(
      name.trim(),
      condition.trim(),
      courseIds || [],
      createdBy
    );

    res.status(201).json({
      success: true,
      message: "Recommendation rule created successfully",
      data: result,
    });
  } catch (error) {
    if (error.message === "Rule name already exists") {
      return res.status(409).json({
        success: false,
        message: error.message,
      });
    }
    console.error("Error in addRecommendationRule:", error);
    next(error);
  }
};

/**
 * Update a recommendation rule
 * PUT /api/admin/catalog/recommendation-rules/:ruleId
 * Body: { name: string, condition: string, courseIds: number[] }
 */
exports.updateRecommendationRule = async (req, res, next) => {
  try {
    const ruleId = parseInt(req.params.ruleId);

    if (isNaN(ruleId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid rule ID",
      });
    }

    const { name, condition, courseIds } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Rule name is required",
      });
    }

    if (!condition || !condition.trim()) {
      return res.status(400).json({
        success: false,
        message: "Rule condition is required",
      });
    }

    const updatedBy = req.user.uuid;
    const result = await CatalogService.updateRecommendationRule(
      ruleId,
      name.trim(),
      condition.trim(),
      courseIds || [],
      updatedBy
    );

    res.json({
      success: true,
      message: "Recommendation rule updated successfully",
      data: result,
    });
  } catch (error) {
    if (error.message === "Recommendation rule not found") {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }
    if (error.message === "Rule name already exists") {
      return res.status(409).json({
        success: false,
        message: error.message,
      });
    }
    console.error("Error in updateRecommendationRule:", error);
    next(error);
  }
};

/**
 * Toggle recommendation rule status
 * PATCH /api/admin/catalog/recommendation-rules/:ruleId/toggle
 */
exports.toggleRecommendationRuleStatus = async (req, res, next) => {
  try {
    const ruleId = parseInt(req.params.ruleId);

    if (isNaN(ruleId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid rule ID",
      });
    }

    const updatedBy = req.user.uuid;
    const result = await CatalogService.toggleRecommendationRuleStatus(ruleId, updatedBy);

    res.json({
      success: true,
      message: "Recommendation rule status updated",
      data: result,
    });
  } catch (error) {
    if (error.message === "Recommendation rule not found") {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }
    console.error("Error in toggleRecommendationRuleStatus:", error);
    next(error);
  }
};

/**
 * Delete a recommendation rule
 * DELETE /api/admin/catalog/recommendation-rules/:ruleId
 */
exports.deleteRecommendationRule = async (req, res, next) => {
  try {
    const ruleId = parseInt(req.params.ruleId);

    if (isNaN(ruleId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid rule ID",
      });
    }

    const result = await CatalogService.deleteRecommendationRule(ruleId);

    res.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    if (error.message === "Recommendation rule not found") {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }
    console.error("Error in deleteRecommendationRule:", error);
    next(error);
  }
};

/**
 * Get active courses for searchable dropdown
 * GET /api/admin/catalog/active-courses
 * Query params: search (optional)
 */
exports.getActiveCourses = async (req, res, next) => {
  try {
    const search = req.query.search || '';
    const courses = await CatalogService.getActiveCourses(search);

    res.json({
      success: true,
      data: courses,
    });
  } catch (error) {
    console.error("Error in getActiveCourses:", error);
    next(error);
  }
};
