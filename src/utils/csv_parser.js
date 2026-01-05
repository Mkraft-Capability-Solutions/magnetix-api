const csv = require('csv-parser');
const { Readable } = require('stream');

/**
 * Parse CSV buffer to JSON array
 * @param {Buffer} fileBuffer - CSV file buffer
 * @returns {Promise<Array>} - Parsed CSV data as array of objects
 */
const parseCSV = (fileBuffer) => {
  return new Promise((resolve, reject) => {
    const results = [];
    const stream = Readable.from(fileBuffer);

    stream
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', (error) => reject(error));
  });
};

/**
 * Validate CSV headers against required headers
 * @param {Array} actualHeaders - Headers from CSV file
 * @param {Array} requiredHeaders - Required headers for this upload type
 * @returns {Object} - { valid: boolean, missing: Array, extra: Array }
 */
const validateCSVHeaders = (actualHeaders, requiredHeaders) => {
  const actualSet = new Set(actualHeaders.map(h => h.toLowerCase().trim()));
  const requiredSet = new Set(requiredHeaders.map(h => h.toLowerCase()));

  const missing = requiredHeaders.filter(h => !actualSet.has(h.toLowerCase()));
  const extra = actualHeaders.filter(h => !requiredSet.has(h.toLowerCase().trim()));

  return {
    valid: missing.length === 0,
    missing,
    extra
  };
};

/**
 * Generate CSV template string for a given upload type
 * @param {string} type - Upload type ('users', 'content', 'assignments')
 * @returns {string} - CSV template string
 */
const generateCSVTemplate = (type) => {
  const templates = {
    users: 'first_name,last_name,email,department,job_title,manager_email,phone,location,hire_date\n',
    content: 'content_id,field,new_value\n',
    assignments: 'user_email,course_id,course_name,due_date,send_notification\n'
  };

  return templates[type] || '';
};

/**
 * Get required headers for a given upload type
 * @param {string} type - Upload type ('users', 'content', 'assignments')
 * @returns {Array} - Required headers
 */
const getRequiredHeaders = (type) => {
  const headers = {
    users: ['first_name', 'last_name', 'email', 'department', 'job_title'],
    content: ['content_id', 'field', 'new_value'],
    assignments: ['user_email']
  };

  return headers[type] || [];
};

/**
 * Get all headers (required + optional) for a given upload type
 * @param {string} type - Upload type ('users', 'content', 'assignments')
 * @returns {Array} - All headers
 */
const getAllHeaders = (type) => {
  const headers = {
    users: ['first_name', 'last_name', 'email', 'department', 'job_title', 'manager_email', 'phone', 'location', 'hire_date'],
    content: ['content_id', 'field', 'new_value'],
    assignments: ['user_email', 'course_id', 'course_name', 'due_date', 'send_notification']
  };

  return headers[type] || [];
};

module.exports = {
  parseCSV,
  validateCSVHeaders,
  generateCSVTemplate,
  getRequiredHeaders,
  getAllHeaders
};
