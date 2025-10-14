// instructor_availability_service.js
const { promisePool } = require('../../config/db');
const { InstructorAvailabilityDTO } = require('../../dto/instructor/availability_dto');

class InstructorAvailabilityService {
    /**
     * Get instructor availability
     * @param {string} instructorUuid - The instructor's UUID
     * @returns {Promise<InstructorAvailabilityDTO>} Instructor availability data
     */
    async getAvailability(instructorUuid) {
        const [rows] = await promisePool.query(
            'CALL instructor_get_availability(?)',
            [instructorUuid]
        );

        if (rows[0].length === 0) {
            // Return default availability if not found
            return {
                instructorUuid: instructorUuid,
                availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
                startTime: '09:00',
                endTime: '17:00',
                timezone: 'UTC',
                isActive: true
            };
        }

        return new InstructorAvailabilityDTO(rows[0][0]);
    }

    /**
     * Update instructor availability
     * @param {string} instructorUuid - The instructor's UUID
     * @param {Object} data - Availability data
     * @param {Array<string>} data.availableDays - Available days array
     * @param {string} data.startTime - Start time in HH:mm format
     * @param {string} data.endTime - End time in HH:mm format
     * @param {string} data.timezone - Timezone
     * @param {boolean} data.isActive - Active status
     * @returns {Promise<Object>} Update result
     */
    async updateAvailability(instructorUuid, data) {
        // Convert available days array to JSON string for MySQL
        const availableDaysJson = JSON.stringify(data.availableDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);

        // Convert time from HH:mm to HH:mm:ss for MySQL TIME type
        const startTime = data.startTime ? `${data.startTime}:00` : null;
        const endTime = data.endTime ? `${data.endTime}:00` : null;

        const [result] = await promisePool.query(
            'CALL instructor_update_availability(?, ?, ?, ?, ?, ?)',
            [
                instructorUuid,
                availableDaysJson,
                startTime,
                endTime,
                data.timezone || 'UTC',
                data.isActive !== undefined ? data.isActive : true
            ]
        );

        return {
            success: true,
            action: result[0][0].action,
            instructorUuid: instructorUuid
        };
    }

    /**
     * Set instructor as unavailable
     * @param {string} instructorUuid - The instructor's UUID
     * @returns {Promise<Object>} Update result
     */
    async setUnavailable(instructorUuid) {
        // Get current availability
        const [rows] = await promisePool.query(
            'CALL instructor_get_availability(?)',
            [instructorUuid]
        );

        let availableDaysJson, startTime, endTime, timezone;

        if (rows[0].length > 0) {
            // Use existing values
            const current = rows[0][0];
            availableDaysJson = typeof current.available_days === 'string'
                ? current.available_days
                : JSON.stringify(current.available_days);
            startTime = current.start_time ? `${current.start_time}:00` : '09:00:00';
            endTime = current.end_time ? `${current.end_time}:00` : '17:00:00';
            timezone = current.timezone || 'UTC';
        } else {
            // Use defaults if no record exists
            availableDaysJson = JSON.stringify(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
            startTime = '09:00:00';
            endTime = '17:00:00';
            timezone = 'UTC';
        }

        const [result] = await promisePool.query(
            'CALL instructor_update_availability(?, ?, ?, ?, ?, ?)',
            [
                instructorUuid,
                availableDaysJson,
                startTime,
                endTime,
                timezone,
                false  // Set isActive to false
            ]
        );

        return {
            success: true,
            action: result[0][0].action,
            instructorUuid: instructorUuid,
            isActive: false
        };
    }
}

module.exports = new InstructorAvailabilityService();
