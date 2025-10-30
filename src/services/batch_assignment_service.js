const { promisePool } = require('../config/db');

class BatchAssignmentService {
  /**
   * Assign batches to a course
   * @param {number} courseId - Course ID
   * @param {array} batchIds - Array of batch IDs
   * @param {boolean} availableToAll - If true, course is available to all batches
   */
  async assignBatchesToCourse(courseId, batchIds, availableToAll = false) {
    const connection = await promisePool.getConnection();
    try {
      await connection.beginTransaction();

      // Update the available_to_all_batches flag
      await connection.query(
        'UPDATE course SET available_to_all_batches = ? WHERE id = ?',
        [availableToAll ? 1 : 0, courseId]
      );

      // Delete existing batch assignments first
      await connection.query(
        'DELETE FROM course_batches WHERE course_id = ?',
        [courseId]
      );

      // Insert batch assignments (whether availableToAll or specific batches)
      if (batchIds && batchIds.length > 0) {
        const values = batchIds.map(batchId => [courseId, batchId]);
        await connection.query(
          'INSERT INTO course_batches (course_id, batch_id) VALUES ?',
          [values]
        );
      }

      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Assign batches to an event
   * @param {number} eventId - Event ID
   * @param {array} batchIds - Array of batch IDs
   * @param {boolean} availableToAll - If true, event is available to all batches
   */
  async assignBatchesToEvent(eventId, batchIds, availableToAll = false) {
    const connection = await promisePool.getConnection();
    try {
      await connection.beginTransaction();

      // Update the available_to_all_batches flag
      await connection.query(
        'UPDATE events SET available_to_all_batches = ? WHERE id = ?',
        [availableToAll ? 1 : 0, eventId]
      );

      // Delete existing batch assignments first
      await connection.query(
        'DELETE FROM event_batches WHERE event_id = ?',
        [eventId]
      );

      // Insert batch assignments (whether availableToAll or specific batches)
      if (batchIds && batchIds.length > 0) {
        const values = batchIds.map(batchId => [eventId, batchId]);
        await connection.query(
          'INSERT INTO event_batches (event_id, batch_id) VALUES ?',
          [values]
        );
      }

      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Get batches assigned to a course
   * @param {number} courseId - Course ID
   * @returns {object} - { availableToAll, batches }
   */
  async getCourseBatches(courseId) {
    const [courseRows] = await promisePool.query(
      'SELECT available_to_all_batches FROM course WHERE id = ?',
      [courseId]
    );

    if (courseRows.length === 0) {
      throw new Error('Course not found');
    }

    const availableToAll = courseRows[0].available_to_all_batches === 1;

    if (availableToAll) {
      // Return all batches
      const [batches] = await promisePool.query('SELECT * FROM batches ORDER BY batch_name');
      return { availableToAll: true, batches };
    }

    // Return only assigned batches
    const [batches] = await promisePool.query(
      `SELECT b.* FROM batches b
       INNER JOIN course_batches cb ON b.id = cb.batch_id
       WHERE cb.course_id = ?
       ORDER BY b.batch_name`,
      [courseId]
    );

    return { availableToAll: false, batches };
  }

  /**
   * Get batches assigned to an event
   * @param {number} eventId - Event ID
   * @returns {object} - { availableToAll, batches }
   */
  async getEventBatches(eventId) {
    const [eventRows] = await promisePool.query(
      'SELECT available_to_all_batches FROM events WHERE id = ?',
      [eventId]
    );

    if (eventRows.length === 0) {
      throw new Error('Event not found');
    }

    const availableToAll = eventRows[0].available_to_all_batches === 1;

    if (availableToAll) {
      // Return all batches
      const [batches] = await promisePool.query('SELECT * FROM batches ORDER BY batch_name');
      return { availableToAll: true, batches };
    }

    // Return only assigned batches
    const [batches] = await promisePool.query(
      `SELECT b.* FROM batches b
       INNER JOIN event_batches eb ON b.id = eb.batch_id
       WHERE eb.event_id = ?
       ORDER BY b.batch_name`,
      [eventId]
    );

    return { availableToAll: false, batches };
  }
}

module.exports = new BatchAssignmentService();
