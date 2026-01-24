const { promisePool } = require("../../config/db");

class CatalogService {
  // ============================================================================
  // GET OPERATIONS
  // ============================================================================

  /**
   * Get all categories with their subcategories
   * Returns hierarchical structure for catalog management
   */
  async getCategoriesWithSubcategories() {
    try {
      // Get all categories
      const [categories] = await promisePool.query(`
        SELECT
          id,
          category_name as name,
          NULL as description,
          creator_id as creatorId,
          created_date as createdAt,
          last_updated as updatedAt
        FROM category
        ORDER BY created_date DESC
      `);

      // Get all subcategories
      const [subcategories] = await promisePool.query(`
        SELECT
          id,
          subcategory_name as name,
          category_id as categoryId,
          NULL as description,
          creator_id as creatorId,
          created_date as createdAt,
          last_updated as updatedAt
        FROM sub_category
        ORDER BY created_date DESC
      `);

      // Get course counts for each category and subcategory
      const [categoryCounts] = await promisePool.query(`
        SELECT
          category_id,
          COUNT(*) as courseCount
        FROM course
        WHERE is_deleted = 0
        GROUP BY category_id
      `);

      const [subcategoryCounts] = await promisePool.query(`
        SELECT
          sub_category_id,
          COUNT(*) as courseCount
        FROM course
        WHERE is_deleted = 0
        GROUP BY sub_category_id
      `);

      // Create lookup maps for course counts
      const categoryCountMap = {};
      categoryCounts.forEach(row => {
        categoryCountMap[row.category_id] = row.courseCount;
      });

      const subcategoryCountMap = {};
      subcategoryCounts.forEach(row => {
        subcategoryCountMap[row.sub_category_id] = row.courseCount;
      });

      // Build hierarchical structure
      const result = categories.map(category => ({
        ...category,
        courseCount: categoryCountMap[category.id] || 0,
        subcategories: subcategories
          .filter(sub => sub.categoryId === category.id)
          .map(sub => ({
            ...sub,
            courseCount: subcategoryCountMap[sub.id] || 0
          }))
      }));

      return result;
    } catch (error) {
      console.error("Error in getCategoriesWithSubcategories:", error);
      throw error;
    }
  }

  /**
   * Get all categories (flat list)
   */
  async getAllCategories() {
    try {
      const [categories] = await promisePool.query(`
        SELECT
          id,
          category_name as name,
          NULL as description,
          creator_id as creatorId,
          created_date as createdAt,
          last_updated as updatedAt,
          (SELECT COUNT(*) FROM course WHERE category_id = category.id AND is_deleted = 0) as courseCount
        FROM category
        ORDER BY created_date DESC
      `);

      return categories;
    } catch (error) {
      console.error("Error in getAllCategories:", error);
      throw error;
    }
  }

  /**
   * Get category by ID with its subcategories
   */
  async getCategoryById(categoryId) {
    try {
      const [categories] = await promisePool.query(`
        SELECT
          id,
          category_name as name,
          NULL as description,
          creator_id as creatorId,
          created_date as createdAt,
          last_updated as updatedAt
        FROM category
        WHERE id = ?
      `, [categoryId]);

      if (categories.length === 0) {
        throw new Error("Category not found");
      }

      const [subcategories] = await promisePool.query(`
        SELECT
          id,
          subcategory_name as name,
          category_id as categoryId,
          NULL as description,
          creator_id as creatorId,
          created_date as createdAt,
          last_updated as updatedAt,
          (SELECT COUNT(*) FROM course WHERE sub_category_id = sub_category.id AND is_deleted = 0) as courseCount
        FROM sub_category
        WHERE category_id = ?
        ORDER BY created_date DESC
      `, [categoryId]);

      const category = categories[0];
      category.subcategories = subcategories;

      return category;
    } catch (error) {
      console.error("Error in getCategoryById:", error);
      throw error;
    }
  }

  // ============================================================================
  // CATEGORY CRUD OPERATIONS
  // ============================================================================

  /**
   * Add a new category
   */
  async addCategory(categoryName, description, creatorId) {
    try {
      // Check if category already exists
      const [existing] = await promisePool.query(
        "SELECT id FROM category WHERE LOWER(category_name) = LOWER(?)",
        [categoryName]
      );

      if (existing.length > 0) {
        throw new Error("Category already exists");
      }

      // Insert new category (description not supported in old table)
      const [result] = await promisePool.query(
        "INSERT INTO category (category_name, creator_id, last_updated_by) VALUES (?, ?, ?)",
        [categoryName, creatorId, creatorId]
      );

      return {
        id: result.insertId,
        name: categoryName,
        description: null,
        creatorId: creatorId,
        courseCount: 0,
        subcategories: []
      };
    } catch (error) {
      console.error("Error in addCategory:", error);
      throw error;
    }
  }

  /**
   * Update a category
   */
  async updateCategory(categoryId, categoryName, description, updatedBy) {
    try {
      // Check if another category with the same name exists
      const [existing] = await promisePool.query(
        "SELECT id FROM category WHERE LOWER(category_name) = LOWER(?) AND id != ?",
        [categoryName, categoryId]
      );

      if (existing.length > 0) {
        throw new Error("Category name already exists");
      }

      // Update category (description not supported in old table)
      const [result] = await promisePool.query(
        "UPDATE category SET category_name = ?, last_updated_by = ?, last_updated = NOW() WHERE id = ?",
        [categoryName, updatedBy, categoryId]
      );

      if (result.affectedRows === 0) {
        throw new Error("Category not found");
      }

      return {
        id: categoryId,
        name: categoryName,
        description: null,
      };
    } catch (error) {
      console.error("Error in updateCategory:", error);
      throw error;
    }
  }

  /**
   * Delete a category (soft delete)
   */
  async deleteCategory(categoryId) {
    try {
      // Check if category is being used by any courses
      const [coursesUsing] = await promisePool.query(
        "SELECT COUNT(*) as count FROM course WHERE category_id = ? AND is_deleted = 0",
        [categoryId]
      );

      if (coursesUsing[0].count > 0) {
        throw new Error(`Cannot delete category that is being used by ${coursesUsing[0].count} course(s)`);
      }

      // Delete the category (hard delete since old table doesn't have is_deleted)
      const [result] = await promisePool.query(
        "DELETE FROM category WHERE id = ?",
        [categoryId]
      );

      if (result.affectedRows === 0) {
        throw new Error("Category not found");
      }

      // Also delete all subcategories under this category
      await promisePool.query(
        "DELETE FROM sub_category WHERE category_id = ?",
        [categoryId]
      );

      return { success: true, message: "Category deleted successfully" };
    } catch (error) {
      console.error("Error in deleteCategory:", error);
      throw error;
    }
  }

  // ============================================================================
  // SUBCATEGORY CRUD OPERATIONS
  // ============================================================================

  /**
   * Add a new subcategory
   */
  async addSubcategory(categoryId, subcategoryName, description, creatorId) {
    try {
      // Verify parent category exists
      const [category] = await promisePool.query(
        "SELECT id FROM category WHERE id = ?",
        [categoryId]
      );

      if (category.length === 0) {
        throw new Error("Parent category not found");
      }

      // Check if subcategory already exists for this category
      const [existing] = await promisePool.query(
        "SELECT id FROM sub_category WHERE category_id = ? AND LOWER(subcategory_name) = LOWER(?)",
        [categoryId, subcategoryName]
      );

      if (existing.length > 0) {
        throw new Error("Subcategory already exists for this category");
      }

      // Insert new subcategory (description not supported in old table)
      const [result] = await promisePool.query(
        "INSERT INTO sub_category (category_id, subcategory_name, creator_id, last_updated_by) VALUES (?, ?, ?, ?)",
        [categoryId, subcategoryName, creatorId, creatorId]
      );

      return {
        id: result.insertId,
        categoryId: categoryId,
        name: subcategoryName,
        description: null,
        creatorId: creatorId,
        courseCount: 0
      };
    } catch (error) {
      console.error("Error in addSubcategory:", error);
      throw error;
    }
  }

  /**
   * Update a subcategory
   */
  async updateSubcategory(subcategoryId, subcategoryName, description, updatedBy) {
    try {
      // Get the category_id first
      const [current] = await promisePool.query(
        "SELECT category_id FROM sub_category WHERE id = ?",
        [subcategoryId]
      );

      if (current.length === 0) {
        throw new Error("Subcategory not found");
      }

      const categoryId = current[0].category_id;

      // Check if another subcategory with the same name exists in this category
      const [existing] = await promisePool.query(
        "SELECT id FROM sub_category WHERE category_id = ? AND LOWER(subcategory_name) = LOWER(?) AND id != ?",
        [categoryId, subcategoryName, subcategoryId]
      );

      if (existing.length > 0) {
        throw new Error("Subcategory name already exists for this category");
      }

      // Update subcategory (description not supported in old table)
      const [result] = await promisePool.query(
        "UPDATE sub_category SET subcategory_name = ?, last_updated_by = ?, last_updated = NOW() WHERE id = ?",
        [subcategoryName, updatedBy, subcategoryId]
      );

      if (result.affectedRows === 0) {
        throw new Error("Subcategory not found");
      }

      return {
        id: subcategoryId,
        categoryId: categoryId,
        name: subcategoryName,
        description: null,
      };
    } catch (error) {
      console.error("Error in updateSubcategory:", error);
      throw error;
    }
  }

  /**
   * Delete a subcategory (soft delete)
   */
  async deleteSubcategory(subcategoryId) {
    try {
      // Check if subcategory is being used by any courses
      const [coursesUsing] = await promisePool.query(
        "SELECT COUNT(*) as count FROM course WHERE sub_category_id = ? AND is_deleted = 0",
        [subcategoryId]
      );

      if (coursesUsing[0].count > 0) {
        throw new Error(`Cannot delete subcategory that is being used by ${coursesUsing[0].count} course(s)`);
      }

      // Delete the subcategory (hard delete since old table doesn't have is_deleted)
      const [result] = await promisePool.query(
        "DELETE FROM sub_category WHERE id = ?",
        [subcategoryId]
      );

      if (result.affectedRows === 0) {
        throw new Error("Subcategory not found");
      }

      return { success: true, message: "Subcategory deleted successfully" };
    } catch (error) {
      console.error("Error in deleteSubcategory:", error);
      throw error;
    }
  }

  // ============================================================================
  // CATALOG COURSES - VIEW OPERATIONS
  // ============================================================================

  /**
   * Get all active courses for catalog view with optional filters
   * Supports filtering by category, subcategory, level, and duration
   */
  async getCatalogCourses(filters = {}) {
    try {
      const { categoryId, subcategoryId, level, minDuration, maxDuration, search } = filters;

      let query = `
        SELECT
          c.id,
          c.title,
          cat.category_name as category,
          subcat.subcategory_name as subcategory,
          c.level,
          c.course_duration as duration,
          c.thumbnail,
          c.short_description as description,
          COALESCE((
            SELECT AVG(rating)
            FROM course_rating
            WHERE course_id = c.id
          ), 0) as rating,
          (
            SELECT COUNT(*)
            FROM enrol
            WHERE course_id = c.id
          ) as enrolledCount
        FROM course c
        LEFT JOIN category cat ON c.category_id = cat.id
        LEFT JOIN sub_category subcat ON c.sub_category_id = subcat.id
        WHERE c.status = 'active' AND c.is_deleted = 0
      `;

      const params = [];

      // Apply category filter
      if (categoryId) {
        query += ` AND c.category_id = ?`;
        params.push(categoryId);
      }

      // Apply subcategory filter
      if (subcategoryId) {
        query += ` AND c.sub_category_id = ?`;
        params.push(subcategoryId);
      }

      // Apply level filter
      if (level) {
        query += ` AND c.level = ?`;
        params.push(level);
      }

      // Apply duration filters
      if (minDuration) {
        query += ` AND c.course_duration >= ?`;
        params.push(minDuration);
      }
      if (maxDuration) {
        query += ` AND c.course_duration <= ?`;
        params.push(maxDuration);
      }

      // Apply search filter
      if (search) {
        query += ` AND (c.title LIKE ? OR c.short_description LIKE ?)`;
        params.push(`%${search}%`, `%${search}%`);
      }

      query += ` ORDER BY c.last_updated DESC`;

      const [courses] = await promisePool.query(query, params);

      // Format the response
      return courses.map(course => ({
        id: course.id.toString(),
        title: course.title,
        category: course.category || 'Uncategorized',
        subcategory: course.subcategory || null,
        level: course.level || 'Beginner',
        duration: this._formatDuration(course.duration),
        thumbnail: course.thumbnail,
        description: course.description,
        rating: parseFloat(course.rating).toFixed(1),
        enrolledCount: course.enrolledCount
      }));
    } catch (error) {
      console.error("Error in getCatalogCourses:", error);
      throw error;
    }
  }

  /**
   * Helper method to format course duration
   */
  _formatDuration(duration) {
    if (!duration) return 'Self-paced';

    // If duration is already a string with 'weeks', return it
    if (typeof duration === 'string' && duration.includes('week')) {
      return duration;
    }

    // If duration is a number (weeks), format it
    const weeks = parseInt(duration);
    if (isNaN(weeks)) return 'Self-paced';

    return `${weeks} ${weeks === 1 ? 'week' : 'weeks'}`;
  }
}

module.exports = new CatalogService();
