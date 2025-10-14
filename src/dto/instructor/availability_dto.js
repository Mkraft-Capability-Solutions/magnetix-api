// instructor_availability_dto.js

class InstructorAvailabilityDTO {
    constructor(data) {
        this.id = data.id;
        this.instructorUuid = data.instructor_uuid;
        this.availableDays = typeof data.available_days === 'string'
            ? JSON.parse(data.available_days)
            : data.available_days;
        this.startTime = data.start_time;
        this.endTime = data.end_time;
        this.timezone = data.timezone || 'UTC';
        this.isActive = data.is_active === 1 || data.is_active === true;
        this.createdAt = data.created_at;
        this.updatedAt = data.updated_at;
    }
}

module.exports = { InstructorAvailabilityDTO };
