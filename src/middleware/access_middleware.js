const AppError = require('../utils/appError');

exports.validateUserAccess = (req, res, next) => {
  const { uuid } = req.body;
  
  if (!uuid) {
    return next(new AppError('UUID is required in the request body', 400));
  }

  // Allow if admin/superadmin or if user is accessing their own profile
  if ([3, 4].includes(req.user.role_id)) {
    return next();
  }

  if (req.user.uuid === uuid) {
    return next();
  }

  return next(
    new AppError('Not authorized to access this resource', 403)
  );
};

exports.validateUpdatePermissions = (req, res, next) => {
  // Prevent non-admins from updating sensitive fields
  if (![4].includes(req.user.role_id)) {
    const sensitiveFields = ['role_id', 'status', 'is_deleted'];
    const attemptedUpdates = Object.keys(req.body);
    
    const unauthorizedUpdates = attemptedUpdates.filter(field => 
      sensitiveFields.includes(field)
    );

    if (unauthorizedUpdates.length > 0) {
      return next(
        new AppError(
          `Not authorized to update sensitive fields: ${unauthorizedUpdates.join(', ')}`,
          403
        )
      );
    }
  }
  next();
};