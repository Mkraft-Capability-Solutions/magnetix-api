const { promisePool } = require('../config/db');
const { 
  StudentDTO, 
  InstructorDTO, 
  AdminDTO, 
  SuperAdminDTO 
} = require('../dto/role_dtos');
const redis = require('../config/redis');
const { validateUpdateFields } = require('../validators/userValidator');
const AppError = require('../utils/appError');

// Cache configuration
const CACHE_TTL = 3600; // 1 hour in seconds

class UserController {
  constructor() {
    this.getRoleTable = this.getRoleTable.bind(this);
    this.createRoleDTO = this.createRoleDTO.bind(this);
  }

  getRoleTable(roleId) {
    const tables = {
      1: 'students',
      2: 'instructors',
      3: 'admins',
      4: 'super_admins'
    };
    if (!tables[roleId]) {
      throw new AppError('Invalid role ID', 400);
    }
    return tables[roleId];
  }

  createRoleDTO(userData, roleData, roleId) {
    const dtoClasses = {
      1: StudentDTO,
      2: InstructorDTO,
      3: AdminDTO,
      4: SuperAdminDTO
    };
    if (!dtoClasses[roleId]) {
      throw new AppError('Invalid role ID', 400);
    }
    return new dtoClasses[roleId](userData, roleData);
  }

  async getUser(req, res, next) {
    try {
      const { uuid } = req.body;

      if (!uuid) {
        return next(new AppError('UUID is required in the request body', 400));
      }

      const cacheKey = `user:${uuid}`;

      // Try cache first
      const cachedUser = await redis.get(cacheKey);
      if (cachedUser) {
        return res.status(200).json({
          status: 'success',
          data: {
            user: JSON.parse(cachedUser)
          }
        });
      }

      // Database query
      const [userRows] = await promisePool.query(
        `SELECT u.*, r.role_detail 
         FROM users u
         JOIN roles r ON u.role_id = r.role_id
         WHERE u.uuid = ? AND u.is_deleted = 0`,
        [uuid]
      );

      if (userRows.length === 0) {
        return next(new AppError('User not found or has been deleted', 404));
      }

      const user = userRows[0];
      const roleTable = this.getRoleTable(user.role_id);

      const [roleData] = await promisePool.query(
        `SELECT * FROM ${roleTable} WHERE user_id = ?`,
        [uuid]
      );

      if (roleData.length === 0) {
        return next(new AppError('Role-specific data not found', 404));
      }

      const userDTO = this.createRoleDTO(user, roleData[0], user.role_id);

      // Cache the result
      await redis.set(cacheKey, JSON.stringify(userDTO), 'EX', CACHE_TTL);

      res.status(200).json({
        status: 'success',
        data: {
          user: userDTO
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async listUsers(req, res, next) {
    try {
      const { page = 1, limit = 10, role_id } = req.body;

      if (!page || !limit) {
        return next(new AppError('Page and limit are required in the request body', 400));
      }

      const offset = (page - 1) * limit;
      
      let query = `SELECT u.*, r.role_detail 
                   FROM users u 
                   JOIN roles r ON u.role_id = r.role_id 
                   WHERE u.is_deleted = 0`;
      const params = [];
      
      if (role_id) {
        query += ` AND u.role_id = ?`;
        params.push(role_id);
      }
      
      query += ` LIMIT ? OFFSET ?`;
      params.push(parseInt(limit), parseInt(offset));

      const [users] = await promisePool.query(query, params);
      const [count] = await promisePool.query(
        'SELECT COUNT(*) as total FROM users WHERE is_deleted = 0' + 
        (role_id ? ' AND role_id = ?' : ''),
        role_id ? [role_id] : []
      );

      const totalPages = Math.ceil(count[0].total / limit);

      res.status(200).json({
        status: 'success',
        results: users.length,
        data: {
          users
        },
        pagination: {
          total: count[0].total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async updateUser(req, res, next) {
    try {
      const { uuid, ...updateData } = req.body;

      if (!uuid) {
        return next(new AppError('UUID is required in the request body', 400));
      }

      // Validate update fields
      const validationErrors = validateUpdateFields(updateData, req.user.role_id);
      if (validationErrors.length > 0) {
        return next(new AppError('Invalid update data', 400, validationErrors));
      }

      const connection = await promisePool.getConnection();
      await connection.beginTransaction();

      try {
        const [userCheck] = await connection.query(
          'SELECT role_id FROM users WHERE uuid = ? AND is_deleted = 0 FOR UPDATE',
          [uuid]
        );

        if (userCheck.length === 0) {
          await connection.rollback();
          connection.release();
          return next(new AppError('User not found or has been deleted', 404));
        }

        const roleId = userCheck[0].role_id;
        const roleTable = this.getRoleTable(roleId);

        // Separate updates
        const userUpdates = {};
        const roleUpdates = {};
        const userFields = ['email', 'status', 'password'];

        Object.keys(updateData).forEach(key => {
          if (userFields.includes(key)) {
            userUpdates[key] = updateData[key];
          } else {
            roleUpdates[key] = updateData[key];
          }
        });

        // Update users table
        if (Object.keys(userUpdates).length > 0) {
          userUpdates.updated_at = new Date();
          await connection.query(
            'UPDATE users SET ? WHERE uuid = ?',
            [userUpdates, uuid]
          );
        }

        // Update role table
        if (Object.keys(roleUpdates).length > 0) {
          await connection.query(
            `UPDATE ${roleTable} SET ? WHERE user_id = ?`,
            [roleUpdates, uuid]
          );
        }

        await connection.commit();
        connection.release();

        // Invalidate cache
        await redis.del(`user:${uuid}`);

        // Return updated user
        const [updatedUser] = await promisePool.query(
          'SELECT * FROM users WHERE uuid = ?',
          [uuid]
        );
        const [updatedRoleData] = await promisePool.query(
          `SELECT * FROM ${roleTable} WHERE user_id = ?`,
          [uuid]
        );

        const userDTO = this.createRoleDTO(updatedUser[0], updatedRoleData[0], roleId);

        res.status(200).json({
          status: 'success',
          data: {
            user: userDTO
          }
        });
      } catch (error) {
        await connection.rollback();
        connection.release();
        throw error;
      }
    } catch (error) {
      next(error);
    }
  }

  async deleteUser(req, res, next) {
    try {
      const { uuid } = req.body;

      if (!uuid) {
        return next(new AppError('UUID is required in the request body', 400));
      }

      const [userCheck] = await promisePool.query(
        'SELECT role_id FROM users WHERE uuid = ? AND is_deleted = 0',
        [uuid]
      );

      if (userCheck.length === 0) {
        return next(new AppError('User not found or already deleted', 404));
      }

      // Soft delete
      const [result] = await promisePool.query(
        'UPDATE users SET is_deleted = 1, updated_at = ? WHERE uuid = ?',
        [new Date(), uuid]
      );

      if (result.affectedRows === 0) {
        return next(new AppError('Failed to delete user', 500));
      }

      // Invalidate cache
      await redis.del(`user:${uuid}`);

      // Audit log
      await promisePool.query(
        'INSERT INTO audit_logs (action, user_id, target_user_id) VALUES (?, ?, ?)',
        ['USER_DELETE', req.user.uuid, uuid]
      );

      res.status(204).json({
        status: 'success',
        data: null
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new UserController();