class MentorDTO {
  constructor(mentorData) {
    this.mentor_id = mentorData.mentor_id;
    this.mentor_user_id = mentorData.mentor_user_id;
    this.mentor_name = mentorData.mentor_name;
    this.mentor_dp = mentorData.mentor_dp;
    this.mentor_about = mentorData.mentor_about;
    this.mentor_social_links = mentorData.mentor_social_links;
    this.current_mentees_count = mentorData.current_mentees_count || 0;
    this.available_days = mentorData.available_days;
    this.available_time_slots = mentorData.available_time_slots;
    this.availability_status = mentorData.availability_status || 'unavailable';
  }
}

class MentorshipDTO {
  constructor(mentorshipData) {
    this.mentorship_id = mentorshipData.mentorship_id;
    this.mentor_id = mentorshipData.mentor_id;
    this.mentor_user_id = mentorshipData.mentor_user_id;
    this.mentor_name = mentorshipData.mentor_name;
    this.mentor_dp = mentorshipData.mentor_dp;
    this.mentorship_status = mentorshipData.mentorship_status;
    this.mentorship_start_date = mentorshipData.mentorship_start_date;
  }
}

class SessionDTO {
  constructor(sessionData) {
    this.session_id = sessionData.session_id;
    this.mentor_id = sessionData.mentor_id;
    this.mentor_name = sessionData.mentor_name;
    this.mentor_dp = sessionData.mentor_dp;
    this.session_date = sessionData.session_date;
    this.session_time = sessionData.session_time;
    this.topic = sessionData.topic;
    this.description = sessionData.description;
    this.url = sessionData.url;
    this.status = sessionData.status;
    this.duration = sessionData.duration;
    this.request_date = sessionData.request_date;
  }
}

module.exports = {
  MentorDTO,
  MentorshipDTO,
  SessionDTO
};