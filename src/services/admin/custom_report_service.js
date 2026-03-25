const repository = require("../../repositories/admin/customReportRepository");
const reportGenerator = require("../../utils/report_generator");
const logger = require("../../config/logger");
const AppError = require("../../utils/appError");

const EXPORT_ROW_LIMIT = 10000;

const DATA_SOURCES = {
  users: {
    label: "Users",
    description: "User accounts and profiles",
    table: "users u",
    joins: [
      "LEFT JOIN (SELECT user_id, first_name, last_name FROM students UNION ALL SELECT user_id, first_name, last_name FROM instructors UNION ALL SELECT user_id, first_name, last_name FROM admins) profile ON u.uuid = profile.user_id",
      "LEFT JOIN student_corporate_info sci ON u.uuid = sci.user_id",
    ],
    baseCondition: "u.is_deleted = 0",
    fields: {
      fullName: { label: "Full Name", select: "CONCAT(profile.first_name, ' ', profile.last_name)", sortable: true },
      email: { label: "Email", select: "u.email", sortable: true },
      role: { label: "Role", select: "CASE u.role_id WHEN 1 THEN 'Student' WHEN 2 THEN 'Instructor' WHEN 3 THEN 'Admin' WHEN 4 THEN 'Super Admin' END", sortable: true },
      status: { label: "Status", select: "u.status", sortable: true, filterable: true, filterType: "select", filterOptions: ["active", "inactive", "suspended"] },
      department: { label: "Department", select: "COALESCE(sci.department, 'N/A')", sortable: true, filterable: true, filterType: "text" },
      designation: { label: "Designation", select: "COALESCE(sci.designation, 'N/A')", sortable: true },
      createdAt: { label: "Created Date", select: "DATE_FORMAT(u.created_at, '%Y-%m-%d')", sortable: true, filterable: true, filterType: "date" },
      lastLogin: { label: "Last Login", select: "DATE_FORMAT(u.updated_at, '%Y-%m-%d %H:%i')", sortable: true },
    },
  },
  courses: {
    label: "Courses",
    description: "Course catalog and details",
    table: "course c",
    joins: [
      "LEFT JOIN course_category cat ON c.category_id = cat.id",
      "LEFT JOIN course_subcategory subcat ON c.sub_category_id = subcat.id",
      "LEFT JOIN language lang ON c.language_id = lang.id",
    ],
    baseCondition: "c.is_deleted = 0",
    fields: {
      title: { label: "Course Title", select: "c.title", sortable: true },
      category: { label: "Category", select: "COALESCE(cat.name, 'Uncategorized')", sortable: true, filterable: true, filterType: "text" },
      subcategory: { label: "Sub Category", select: "COALESCE(subcat.name, 'N/A')", sortable: true },
      level: { label: "Level", select: "c.level", sortable: true, filterable: true, filterType: "select", filterOptions: ["beginner", "intermediate", "advanced"] },
      status: { label: "Status", select: "c.status", sortable: true, filterable: true, filterType: "select", filterOptions: ["draft", "pending", "published", "archived"] },
      language: { label: "Language", select: "lang.name", sortable: true },
      duration: { label: "Duration", select: "c.course_duration", sortable: true },
      createdAt: { label: "Created Date", select: "DATE_FORMAT(c.created_at, '%Y-%m-%d')", sortable: true, filterable: true, filterType: "date" },
      publishedAt: { label: "Published Date", select: "DATE_FORMAT(c.published_at, '%Y-%m-%d')", sortable: true },
    },
  },
  enrollments: {
    label: "Enrollments",
    description: "Course enrollments and progress",
    table: "enrol e",
    joins: [
      "LEFT JOIN users u ON e.user_id = u.uuid",
      "LEFT JOIN (SELECT user_id, first_name, last_name FROM students UNION ALL SELECT user_id, first_name, last_name FROM instructors UNION ALL SELECT user_id, first_name, last_name FROM admins) profile ON u.uuid = profile.user_id",
      "LEFT JOIN course c ON e.course_id = c.id",
      "LEFT JOIN course_category cat ON c.category_id = cat.id",
    ],
    baseCondition: "u.is_deleted = 0",
    fields: {
      studentName: { label: "Student Name", select: "CONCAT(profile.first_name, ' ', profile.last_name)", sortable: true },
      email: { label: "Email", select: "u.email", sortable: true },
      courseTitle: { label: "Course Title", select: "c.title", sortable: true },
      category: { label: "Category", select: "COALESCE(cat.name, 'Uncategorized')", sortable: true, filterable: true, filterType: "text" },
      enrolledDate: { label: "Enrolled Date", select: "DATE_FORMAT(e.enrolled_date, '%Y-%m-%d')", sortable: true, filterable: true, filterType: "date" },
      progress: { label: "Progress (%)", select: "COALESCE(e.progress, 0)", sortable: true },
      lastAccessed: { label: "Last Accessed", select: "DATE_FORMAT(e.last_updated, '%Y-%m-%d %H:%i')", sortable: true },
    },
  },
  certificates: {
    label: "Certificates",
    description: "Issued certificates and achievements",
    table: "student_certificates sc",
    joins: [
      "LEFT JOIN users u ON sc.user_id = u.uuid",
      "LEFT JOIN (SELECT user_id, first_name, last_name FROM students UNION ALL SELECT user_id, first_name, last_name FROM instructors UNION ALL SELECT user_id, first_name, last_name FROM admins) profile ON u.uuid = profile.user_id",
    ],
    baseCondition: "u.is_deleted = 0",
    fields: {
      studentName: { label: "Student Name", select: "CONCAT(profile.first_name, ' ', profile.last_name)", sortable: true },
      email: { label: "Email", select: "u.email", sortable: true },
      certificateName: { label: "Certificate Name", select: "sc.certificate_name", sortable: true, filterable: true, filterType: "text" },
      issuedDate: { label: "Issued Date", select: "DATE_FORMAT(sc.issued_date, '%Y-%m-%d')", sortable: true, filterable: true, filterType: "date" },
      expiryDate: { label: "Expiry Date", select: "DATE_FORMAT(sc.expiry_date, '%Y-%m-%d')", sortable: true },
    },
  },
  leaderboard: {
    label: "Leaderboard & Points",
    description: "User points, levels, and rankings",
    table: "users u",
    joins: [
      "LEFT JOIN (SELECT user_id, first_name, last_name FROM students UNION ALL SELECT user_id, first_name, last_name FROM instructors UNION ALL SELECT user_id, first_name, last_name FROM admins) profile ON u.uuid = profile.user_id",
      "LEFT JOIN user_points up ON u.uuid = up.user_id",
      "LEFT JOIN student_corporate_info sci ON u.uuid = sci.user_id",
      "LEFT JOIN (SELECT user_id, COUNT(*) as completed FROM enrol WHERE enrolled_date IS NOT NULL GROUP BY user_id) cs ON u.uuid = cs.user_id",
      "LEFT JOIN (SELECT user_id, COUNT(*) as total_certs FROM student_certificates GROUP BY user_id) ct ON u.uuid = ct.user_id",
    ],
    baseCondition: "u.is_deleted = 0",
    fields: {
      fullName: { label: "Full Name", select: "CONCAT(profile.first_name, ' ', profile.last_name)", sortable: true },
      email: { label: "Email", select: "u.email", sortable: true },
      department: { label: "Department", select: "COALESCE(sci.department, 'N/A')", sortable: true, filterable: true, filterType: "text" },
      totalPoints: { label: "Total Points", select: "COALESCE(up.total_points, 0)", sortable: true },
      level: { label: "Level", select: "CASE WHEN COALESCE(up.total_points, 0) >= 15000 THEN 'Level 4' WHEN COALESCE(up.total_points, 0) >= 10000 THEN 'Level 3' WHEN COALESCE(up.total_points, 0) >= 5000 THEN 'Level 2' ELSE 'Level 1' END", sortable: true },
      coursesCompleted: { label: "Courses Completed", select: "COALESCE(cs.completed, 0)", sortable: true },
      certificates: { label: "Certificates", select: "COALESCE(ct.total_certs, 0)", sortable: true },
    },
  },
};

class CustomReportService {
  // ============================================================================
  // PUBLIC METHODS
  // ============================================================================

  getDataSources() {
    const sources = {};
    for (const [key, source] of Object.entries(DATA_SOURCES)) {
      sources[key] = {
        label: source.label,
        description: source.description,
        fields: Object.entries(source.fields).map(([fieldKey, field]) => ({
          key: fieldKey,
          label: field.label,
          sortable: field.sortable || false,
          filterable: field.filterable || false,
          filterType: field.filterType || null,
          filterOptions: field.filterOptions || null,
        })),
      };
    }
    return sources;
  }

  async buildReport(config) {
    const { dataSource, fields, filters, groupBy, sortBy, sortOrder, limit, offset } = config;

    const source = this._getValidatedSource(dataSource);
    const validFields = this._getValidatedFields(fields, source);

    const selectClauses = validFields.map((f) => `${source.fields[f].select} AS \`${f}\``);

    let baseQuery = `SELECT ${selectClauses.join(", ")} FROM ${source.table}`;
    baseQuery += this._buildJoinClause(source);

    const { whereClause, params } = this._buildWhereClause(source, filters);
    baseQuery += whereClause;

    if (groupBy && source.fields[groupBy]) {
      baseQuery += ` GROUP BY ${source.fields[groupBy].select}`;
    }

    const [totalRecords, rows] = await Promise.all([
      repository.executeCountQuery(baseQuery, params),
      this._executeWithSortAndPagination(baseQuery, params, source, sortBy, sortOrder, limit, offset),
    ]);

    return {
      data: rows,
      totalRecords,
      limit: this._clampLimit(limit),
      offset: Math.max(parseInt(offset) || 0, 0),
      fields: validFields.map((f) => ({ key: f, label: source.fields[f].label })),
    };
  }

  async exportReport(config) {
    const { dataSource, fields, filters, groupBy, sortBy, sortOrder, format, reportName } = config;

    const source = this._getValidatedSource(dataSource);
    const validFields = this._getValidatedFields(fields, source);

    const selectClauses = validFields.map((f) => `${source.fields[f].select} AS \`${f}\``);

    let query = `SELECT ${selectClauses.join(", ")} FROM ${source.table}`;
    query += this._buildJoinClause(source);

    const { whereClause, params } = this._buildWhereClause(source, filters);
    query += whereClause;

    if (groupBy && source.fields[groupBy]) {
      query += ` GROUP BY ${source.fields[groupBy].select}`;
    }

    if (sortBy && source.fields[sortBy]) {
      const order = sortOrder === "desc" ? "DESC" : "ASC";
      query += ` ORDER BY ${source.fields[sortBy].select} ${order}`;
    }

    query += ` LIMIT ${EXPORT_ROW_LIMIT}`;

    const rows = await repository.executeQuery(query, params);
    const title = reportName || `Custom ${source.label} Report`;

    const result = await reportGenerator.generateReport(
      "custom-report",
      format,
      title,
      rows,
      { customFields: validFields.map((f) => ({ key: f, label: source.fields[f].label })) }
    );

    return { ...result, recordCount: rows.length };
  }

  async aggregateReport(config) {
    const { dataSource, groupByField, aggregateField, aggregateFunction, filters, limit } = config;

    const source = this._getValidatedSource(dataSource);
    const groupField = source.fields[groupByField];
    if (!groupField) {
      throw new AppError(`Invalid group by field: ${groupByField}`, 400);
    }

    const aggExpr = this._buildAggregateExpression(aggregateFunction, aggregateField, source);

    let query = `SELECT ${groupField.select} AS \`label\`, ${aggExpr} AS \`value\` FROM ${source.table}`;
    query += this._buildJoinClause(source);

    const { whereClause, params } = this._buildWhereClause(source, filters);
    query += whereClause;
    query += ` GROUP BY ${groupField.select}`;
    query += " ORDER BY `value` DESC";
    query += " LIMIT ?";

    const resultLimit = Math.min(Math.max(parseInt(limit) || 10, 1), 50);
    params.push(resultLimit);

    // Build total count query with same filters
    let totalQuery = `SELECT COUNT(*) AS total FROM ${source.table}`;
    totalQuery += this._buildJoinClause(source);
    const { whereClause: totalWhere, params: totalParams } = this._buildWhereClause(source, filters);
    totalQuery += totalWhere;

    const [rows, totalRows] = await Promise.all([
      repository.executeQuery(query, params),
      repository.executeQuery(totalQuery, totalParams),
    ]);

    const totalCount = totalRows[0]?.total || 0;
    const values = rows.map((r) => Number(r.value) || 0);
    const sum = values.reduce((a, b) => a + b, 0);

    return {
      chartData: rows.map((r) => ({
        label: r.label !== null && r.label !== undefined ? String(r.label) : "N/A",
        value: Number(r.value) || 0,
      })),
      summary: {
        totalRecords: totalCount,
        groupCount: rows.length,
        sum,
        average: rows.length > 0 ? Math.round((sum / rows.length) * 100) / 100 : 0,
        max: values.length > 0 ? Math.max(...values) : 0,
      },
      groupByLabel: groupField.label,
      aggregateLabel: aggregateField ? (source.fields[aggregateField]?.label || "Count") : "Count",
      aggregateFunction: (aggregateFunction || "count").toLowerCase(),
    };
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  _getValidatedSource(dataSource) {
    const source = DATA_SOURCES[dataSource];
    if (!source) {
      throw new AppError(`Invalid data source: ${dataSource}`, 400);
    }
    return source;
  }

  _getValidatedFields(fields, source) {
    const validFields = fields.filter((f) => source.fields[f]);
    if (validFields.length === 0) {
      throw new AppError("No valid fields selected", 400);
    }
    return validFields;
  }

  _buildJoinClause(source) {
    if (!source.joins || source.joins.length === 0) return "";
    return " " + source.joins.join(" ");
  }

  _buildWhereClause(source, filters) {
    const conditions = [];
    const params = [];

    if (source.baseCondition) {
      conditions.push(source.baseCondition);
    }

    if (filters && Array.isArray(filters)) {
      for (const filter of filters) {
        const field = source.fields[filter.field];
        if (!field || !field.filterable) continue;

        switch (filter.operator) {
          case "equals":
            conditions.push(`${field.select} = ?`);
            params.push(filter.value);
            break;
          case "contains":
            conditions.push(`${field.select} LIKE ?`);
            params.push(`%${filter.value}%`);
            break;
          case "startsWith":
            conditions.push(`${field.select} LIKE ?`);
            params.push(`${filter.value}%`);
            break;
          case "greaterThan":
            conditions.push(`${field.select} > ?`);
            params.push(filter.value);
            break;
          case "lessThan":
            conditions.push(`${field.select} < ?`);
            params.push(filter.value);
            break;
          case "between":
            if (filter.value && filter.valueTo) {
              conditions.push(`${field.select} BETWEEN ? AND ?`);
              params.push(filter.value, filter.valueTo);
            }
            break;
          case "in":
            if (Array.isArray(filter.value) && filter.value.length > 0) {
              const placeholders = filter.value.map(() => "?").join(", ");
              conditions.push(`${field.select} IN (${placeholders})`);
              params.push(...filter.value);
            }
            break;
        }
      }
    }

    const whereClause = conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : "";
    return { whereClause, params };
  }

  _buildAggregateExpression(aggregateFunction, aggregateField, source) {
    const aggFunc = (aggregateFunction || "count").toLowerCase();

    if (aggregateField && source.fields[aggregateField]) {
      const aggFieldDef = source.fields[aggregateField];
      switch (aggFunc) {
        case "sum":
          return `SUM(${aggFieldDef.select})`;
        case "avg":
          return `ROUND(AVG(${aggFieldDef.select}), 2)`;
        case "min":
          return `MIN(${aggFieldDef.select})`;
        case "max":
          return `MAX(${aggFieldDef.select})`;
        default:
          return "COUNT(*)";
      }
    }
    return "COUNT(*)";
  }

  _clampLimit(limit) {
    return Math.min(Math.max(parseInt(limit) || 50, 1), 1000);
  }

  async _executeWithSortAndPagination(baseQuery, baseParams, source, sortBy, sortOrder, limit, offset) {
    let query = baseQuery;

    if (sortBy && source.fields[sortBy]) {
      const order = sortOrder === "desc" ? "DESC" : "ASC";
      query += ` ORDER BY ${source.fields[sortBy].select} ${order}`;
    }

    const pageLimit = this._clampLimit(limit);
    const pageOffset = Math.max(parseInt(offset) || 0, 0);
    query += " LIMIT ? OFFSET ?";

    return repository.executeQuery(query, [...baseParams, pageLimit, pageOffset]);
  }
}

module.exports = new CustomReportService();
