// instructor_mentorship_dto.js
class MentorshipRequestDTO {
    constructor(data) {
        this.id = data.id;
        this.menteeId = data.menteeId;
        this.mentorId = data.mentorId;
        this.status = data.status;
        this.datetime = data.datetime;
        this.menteeFirstName = data.mentee_first_name;
        this.menteeLastName = data.mentee_last_name;
        this.menteeEmail = data.mentee_email;
    }
}

class MenteeDTO {
    constructor(data) {
        this.id = data.id;
        this.menteeId = data.menteeId;
        this.mentorId = data.mentorId;
        this.status = data.status;
        this.datetime = data.datetime;
        this.menteeFirstName = data.mentee_first_name;
        this.menteeLastName = data.mentee_last_name;
        this.menteeEmail = data.mentee_email;
        this.menteeDp = data.mentee_dp;
    }
}

class SessionRequestDTO {
    constructor(data) {
        this.id = data.id;
        this.menteeId = data.mentee_id;
        this.mentorId = data.mentor_id;
        this.sessionDate = data.session_date;
        this.sessionTime = data.session_time;
        this.topic = data.topic;
        this.description = data.description;
        this.url = data.url;
        this.status = data.status;
        this.duration = data.duration;
        this.menteeFirstName = data.mentee_first_name;
        this.menteeLastName = data.mentee_last_name;
        this.menteeEmail = data.mentee_email;
        this.menteeDp = data.mentee_dp;
    }
}

module.exports = {
    MentorshipRequestDTO,
    MenteeDTO,
    SessionRequestDTO
};