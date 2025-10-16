const { promisePool } = require("../../config/db");

class AdminBatchService {
  async getAllBatches() {
    const [rows] = await promisePool.query(`
      SELECT
        id,
        batch_name
      FROM batches
      ORDER BY batch_name ASC
    `);
    return rows;
  }
}

module.exports = new AdminBatchService();
