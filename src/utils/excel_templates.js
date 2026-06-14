const ExcelJS = require('exceljs');

// Source of truth: must stay in sync with USER_ROLE_MAP keys in
// src/services/{admin,super_admin}/bulk_upload_service.js. The 'student' alias
// is intentionally omitted from the dropdown — backend still accepts it for
// back-compat, but the UI should steer users to the canonical 'learner'.
const USER_ROLE_OPTIONS = ['learner', 'instructor', 'admin'];

const USER_HEADERS = [
  'first_name',
  'last_name',
  'email',
  'role',
  'department',
  'job_title',
  'manager_email',
  'phone',
  'location'
];

/**
 * Build the bulk-user-upload XLSX template as a Buffer.
 * - Header row (bold, frozen).
 * - Single sample row so users immediately see expected shape.
 * - Data-validation dropdown on the `role` column with the canonical role names,
 *   plus a header cell note for users on platforms that don't render dropdowns.
 *
 * Note: the upload endpoint still expects CSV. Users edit the XLSX in
 * Excel/Sheets/Numbers and "Save As CSV" before uploading. The dropdown is
 * lost in the CSV but the chosen value persists.
 */
const generateUsersXLSXTemplate = async () => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Magnetix';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Users', {
    views: [{ state: 'frozen', ySplit: 1 }]
  });

  sheet.columns = USER_HEADERS.map((h) => ({
    header: h,
    key: h,
    width: Math.max(14, h.length + 4)
  }));

  // Style header row
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.alignment = { vertical: 'middle', horizontal: 'left' };
  headerRow.height = 20;

  // Sample row to demonstrate format
  sheet.addRow({
    first_name: 'John',
    last_name: 'Doe',
    email: 'john.doe@company.com',
    role: 'learner',
    department: 'Engineering',
    job_title: 'Software Engineer',
    manager_email: '',
    phone: '9876543210',
    location: 'New York'
  });

  // Find the 1-indexed column position for `role`
  const roleColIndex = USER_HEADERS.indexOf('role') + 1;
  const roleColLetter = sheet.getColumn(roleColIndex).letter;

  // Cell note on the header cell — visible on hover in Excel/Sheets/Numbers
  // even when the dropdown isn't (e.g. Numbers' partial DV support).
  sheet.getCell(`${roleColLetter}1`).note = `Pick from dropdown. Allowed: ${USER_ROLE_OPTIONS.join(', ')}`;

  // Apply the dropdown to a generous range so users adding rows still get it.
  // ExcelJS list formula must be a comma-joined quoted string.
  const listFormula = `"${USER_ROLE_OPTIONS.join(',')}"`;
  for (let r = 2; r <= 1000; r++) {
    sheet.getCell(`${roleColLetter}${r}`).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: [listFormula],
      showErrorMessage: true,
      errorStyle: 'error',
      errorTitle: 'Invalid role',
      error: `Role must be one of: ${USER_ROLE_OPTIONS.join(', ')}`
    };
  }

  return workbook.xlsx.writeBuffer();
};

module.exports = {
  generateUsersXLSXTemplate,
  USER_ROLE_OPTIONS,
  USER_HEADERS
};
