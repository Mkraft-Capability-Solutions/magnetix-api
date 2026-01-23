const express = require("express");
const router = express.Router();
const catalogController = require("../../controllers/admin/catalog_controller");
const { authenticate, authorize } = require("../../middleware/auth_middleware");

// All routes require admin authentication
router.use(authenticate);
router.use(authorize(3)); // Role 3 = Admin, Role 4 = Super Admin

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

module.exports = router;
