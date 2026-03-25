const { promisePool } = require("../../config/db");

class CustomReportRepository {
  /**
   * Execute a parameterized query and return rows
   */
  async executeQuery(query, params) {
    const [rows] = await promisePool.query(query, params);
    return rows;
  }

  /**
   * Execute a count query wrapping the given base query
   */
  async executeCountQuery(baseQuery, params) {
    const countQuery = `SELECT COUNT(*) AS total FROM (${baseQuery}) AS counted`;
    const [rows] = await promisePool.query(countQuery, params);
    return rows[0]?.total || 0;
  }
}

module.exports = new CustomReportRepository();
