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
    users: 'first_name,last_name,email,role,department,job_title,manager_email,phone,location\n',
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
    users: ['first_name', 'last_name', 'email', 'role'],
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
    users: ['first_name', 'last_name', 'email', 'role', 'department', 'job_title', 'manager_email', 'phone', 'location'],
    content: ['content_id', 'field', 'new_value'],
    assignments: ['user_email', 'course_id', 'course_name', 'due_date', 'send_notification']
  };

  return headers[type] || [];
};

/**
 * Generate CSV sample with example data for a given upload type
 * @param {string} type - Upload type ('users', 'content', 'assignments')
 * @returns {string} - CSV sample string with example data
 */
const generateSampleCSV = (type) => {
  const samples = {
    users:
`first_name,last_name,email,role,department,job_title,manager_email,phone,location
John,Doe,john.doe@company.com,student,Engineering,Software Engineer,jane.smith@company.com,9876543210,New York
Jane,Smith,jane.smith@company.com,admin,Engineering,Senior Developer,,9123456789,San Francisco
Bob,Johnson,bob.johnson@company.com,instructor,Marketing,Marketing Manager,,8765432109,Chicago
Alice,Williams,alice.williams@company.com,student,Sales,Sales Representative,bob.johnson@company.com,7654321098,Boston
Charlie,Brown,charlie.brown@company.com,super_admin,IT,System Administrator,,5551234567,Seattle
`,
    content:
`content_id,field,new_value
1,title,Introduction to Programming - Updated
1,description,This comprehensive course covers programming fundamentals
2,status,active
3,category,Technical Training
`,
    assignments:
`user_email,course_id,course_name,due_date,send_notification
john.doe@company.com,1,,2025-02-15,Yes
jane.smith@company.com,2,,2025-03-01,No
bob.johnson@company.com,,Security Fundamentals,2025-04-20,Yes
`
  };

  return samples[type] || '';
};

module.exports = {
  parseCSV,
  validateCSVHeaders,
  generateCSVTemplate,
  generateSampleCSV,
  getRequiredHeaders,
  getAllHeaders
};
