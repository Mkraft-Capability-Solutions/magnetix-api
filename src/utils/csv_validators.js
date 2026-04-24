/**
 * Validate email format
 * @param {string} email - Email address to validate
 * @returns {boolean} - True if valid email format
 */
const isValidEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

/**
 * Validate date format (YYYY-MM-DD)
 * @param {string} dateString - Date string to validate
 * @returns {boolean} - True if valid date format
 */
const isValidDate = (dateString) => {
  if (!dateString || typeof dateString !== 'string') return false;
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateString)) return false;

  // Check if it's a valid date
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
};

/**
 * Validate phone number format (flexible)
 * @param {string} phone - Phone number to validate
 * @returns {boolean} - True if valid phone format
 */
const isValidPhone = (phone) => {
  if (!phone || typeof phone !== 'string') return false;
  // Allow various formats: 123-456-7890, (123) 456-7890, 123.456.7890, 1234567890
  const phoneRegex = /^[\d\s\-().+]+$/;
  const cleaned = phone.replace(/[\s\-().]/g, '');
  return phoneRegex.test(phone) && cleaned.length >= 10 && cleaned.length <= 15;
};

/**
 * Validate course status value
 * @param {string} status - Status value
 * @returns {boolean} - True if valid status
 */
const isValidCourseStatus = (status) => {
  if (!status || typeof status !== 'string') return false;
  const validStatuses = ['active', 'inactive', 'draft'];
  return validStatuses.includes(status.toLowerCase());
};

/**
 * Validate yes/no value
 * @param {string} value - Yes/No value
 * @returns {boolean} - True if valid yes/no
 */
const isValidYesNo = (value) => {
  if (!value || typeof value !== 'string') return false;
  const validValues = ['yes', 'no', 'y', 'n', 'true', 'false', '1', '0'];
  return validValues.includes(value.toLowerCase());
};

/**
 * Check if a value is empty or null
 * @param {any} value - Value to check
 * @returns {boolean} - True if empty
 */
const isEmpty = (value) => {
  return value === null || value === undefined || value === '' ||
         (typeof value === 'string' && value.trim() === '');
};

/**
 * Validate required fields in a row
 * @param {Object} row - CSV row object
 * @param {Array} requiredFields - Array of required field names
 * @returns {Array} - Array of missing field names
 */
const validateRequiredFields = (row, requiredFields) => {
  const missing = [];

  for (const field of requiredFields) {
    if (isEmpty(row[field])) {
      missing.push(field);
    }
  }

  return missing;
};

/**
 * Validate a single user row
 * @param {Object} row - User row object
 * @param {number} rowIndex - Row number (for error reporting)
 * @returns {Object} - { valid: boolean, errors: Array }
 */
const validateUserRow = (row, rowIndex) => {
  const errors = [];

  // Required fields
  const missing = validateRequiredFields(row, ['first_name', 'last_name', 'email', 'role']);
  if (missing.length > 0) {
    errors.push({
      row: rowIndex,
      field: missing.join(', '),
      message: `Required field(s) missing: ${missing.join(', ')}`
    });
  }

  // Email format
  if (!isEmpty(row.email) && !isValidEmail(row.email)) {
    errors.push({
      row: rowIndex,
      field: 'email',
      message: 'Invalid email format'
    });
  }

  // Validate role value (STRICT: only student, admin, instructor)
  const validRoles = ['student', 'admin', 'instructor'];
  if (!isEmpty(row.role) && !validRoles.includes(row.role.toLowerCase())) {
    errors.push({
      row: rowIndex,
      field: 'role',
      message: `Invalid role. Allowed values are: ${validRoles.join(', ')}`
    });
  }

  // Manager email format (optional but must be valid if provided)
  if (!isEmpty(row.manager_email) && !isValidEmail(row.manager_email)) {
    errors.push({
      row: rowIndex,
      field: 'manager_email',
      message: 'Invalid manager email format'
    });
  }

  // Phone format (optional but must be valid if provided)
  if (!isEmpty(row.phone) && !isValidPhone(row.phone)) {
    errors.push({
      row: rowIndex,
      field: 'phone',
      message: 'Invalid phone number format'
    });
  }

  // Hire date format (optional but must be valid if provided)
  if (!isEmpty(row.hire_date) && !isValidDate(row.hire_date)) {
    errors.push({
      row: rowIndex,
      field: 'hire_date',
      message: 'Invalid date format (expected YYYY-MM-DD)'
    });
  }

  // Organization ID format (optional but must be numeric if provided)
  if (!isEmpty(row.organization_id) && isNaN(parseInt(row.organization_id))) {
    errors.push({
      row: rowIndex,
      field: 'organization_id',
      message: 'Organization ID must be a number'
    });
  }

  // Organization name format (optional but must be non-empty string if provided)
  if (!isEmpty(row.organization_name) && typeof row.organization_name !== 'string') {
    errors.push({
      row: rowIndex,
      field: 'organization_name',
      message: 'Organization name must be a valid string'
    });
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Validate a single content row
 * @param {Object} row - Content row object
 * @param {number} rowIndex - Row number (for error reporting)
 * @returns {Object} - { valid: boolean, errors: Array }
 */
const validateContentRow = (row, rowIndex) => {
  const errors = [];

  // Required fields
  const missing = validateRequiredFields(row, ['content_id', 'field', 'new_value']);
  if (missing.length > 0) {
    errors.push({
      row: rowIndex,
      field: missing.join(', '),
      message: `Required field(s) missing: ${missing.join(', ')}`
    });
  }

  // Validate field name is in allowed list
  const allowedFields = ['title', 'description', 'category', 'status', 'tags', 'course_duration', 'total_lessons'];
  if (!isEmpty(row.field) && !allowedFields.includes(row.field.toLowerCase())) {
    errors.push({
      row: rowIndex,
      field: 'field',
      message: `Invalid field name. Allowed: ${allowedFields.join(', ')}`
    });
  }

  // Validate status value if updating status
  if (!isEmpty(row.field) && row.field.toLowerCase() === 'status' && !isEmpty(row.new_value)) {
    if (!isValidCourseStatus(row.new_value)) {
      errors.push({
        row: rowIndex,
        field: 'new_value',
        message: 'Invalid status value. Allowed: active, inactive, draft'
      });
    }
  }

  // content_id must be numeric
  if (!isEmpty(row.content_id) && isNaN(parseInt(row.content_id))) {
    errors.push({
      row: rowIndex,
      field: 'content_id',
      message: 'Content ID must be a number'
    });
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Validate a single assignment row
 * @param {Object} row - Assignment row object
 * @param {number} rowIndex - Row number (for error reporting)
 * @returns {Object} - { valid: boolean, errors: Array }
 */
const validateAssignmentRow = (row, rowIndex) => {
  const errors = [];

  // Required fields
  const missing = validateRequiredFields(row, ['user_email']);
  if (missing.length > 0) {
    errors.push({
      row: rowIndex,
      field: missing.join(', '),
      message: `Required field(s) missing: ${missing.join(', ')}`
    });
  }

  // Email format
  if (!isEmpty(row.user_email) && !isValidEmail(row.user_email)) {
    errors.push({
      row: rowIndex,
      field: 'user_email',
      message: 'Invalid email format'
    });
  }

  // Must have either course_id or course_name
  if (isEmpty(row.course_id) && isEmpty(row.course_name)) {
    errors.push({
      row: rowIndex,
      field: 'course_id/course_name',
      message: 'Either course_id or course_name is required'
    });
  }

  // course_id must be numeric if provided
  if (!isEmpty(row.course_id) && isNaN(parseInt(row.course_id))) {
    errors.push({
      row: rowIndex,
      field: 'course_id',
      message: 'Course ID must be a number'
    });
  }

  // Due date format (optional but must be valid if provided)
  if (!isEmpty(row.due_date) && !isValidDate(row.due_date)) {
    errors.push({
      row: rowIndex,
      field: 'due_date',
      message: 'Invalid date format (expected YYYY-MM-DD)'
    });
  }

  // Send notification format (optional but must be yes/no if provided)
  if (!isEmpty(row.send_notification) && !isValidYesNo(row.send_notification)) {
    errors.push({
      row: rowIndex,
      field: 'send_notification',
      message: 'Send notification must be Yes/No'
    });
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

module.exports = {
  isValidEmail,
  isValidDate,
  isValidPhone,
  isValidCourseStatus,
  isValidYesNo,
  isEmpty,
  validateRequiredFields,
  validateUserRow,
  validateContentRow,
  validateAssignmentRow
};
