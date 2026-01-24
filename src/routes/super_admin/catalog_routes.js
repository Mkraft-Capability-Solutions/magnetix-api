const express = require("express");
const router = express.Router();
const catalogController = require("../../controllers/super_admin/catalog_controller");
const { authenticate, authorize } = require("../../middleware/auth_middleware");

// All routes require super admin authentication
router.use(authenticate);
router.use(authorize(4)); // Role 4 = Super Admin

// ============================================================================
// CATEGORY ROUTES
// ============================================================================

// Get all categories with subcategories (hierarchical)
router.get("/categories", catalogController.getCategoriesWithSubcategories);

// Get all categories (flat list)
router.get("/categories/list", catalogController.getAllCategories);

// Get category by ID
router.get("/categories/:categoryId", catalogController.getCategoryById);

// Add new category
router.post("/categories", catalogController.addCategory);

// Update category
router.put("/categories/:categoryId", catalogController.updateCategory);

// Delete category
router.delete("/categories/:categoryId", catalogController.deleteCategory);

// ============================================================================
// SUBCATEGORY ROUTES
// ============================================================================

// Add new subcategory
router.post("/subcategories", catalogController.addSubcategory);

// Update subcategory
router.put("/subcategories/:subcategoryId", catalogController.updateSubcategory);

// Delete subcategory
router.delete("/subcategories/:subcategoryId", catalogController.deleteSubcategory);

// ============================================================================
// CATALOG COURSES ROUTES
// ============================================================================

// Get all catalog courses with optional filters
router.get("/courses", catalogController.getCatalogCourses);

// ============================================================================
// FEATURED COURSES ROUTES
// ============================================================================

// Get all featured courses
router.get("/featured-courses", catalogController.getFeaturedCourses);

// Add a featured course
router.post("/featured-courses", catalogController.addFeaturedCourse);

// Toggle featured course status
router.patch("/featured-courses/:featuredId/toggle", catalogController.toggleFeaturedCourse);

// Remove a featured course
router.delete("/featured-courses/:featuredId", catalogController.removeFeaturedCourse);

// ============================================================================
// RECOMMENDATION RULES ROUTES
// ============================================================================

// Get all recommendation rules
router.get("/recommendation-rules", catalogController.getRecommendationRules);

// Add a new recommendation rule
router.post("/recommendation-rules", catalogController.addRecommendationRule);

// Update a recommendation rule
router.put("/recommendation-rules/:ruleId", catalogController.updateRecommendationRule);

// Toggle recommendation rule status
router.patch("/recommendation-rules/:ruleId/toggle", catalogController.toggleRecommendationRuleStatus);

// Delete a recommendation rule
router.delete("/recommendation-rules/:ruleId", catalogController.deleteRecommendationRule);

// ============================================================================
// HELPER ROUTES
// ============================================================================

// Get active courses for searchable dropdown
router.get("/active-courses", catalogController.getActiveCourses);

module.exports = router;
