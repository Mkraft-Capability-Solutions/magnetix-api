class MentorDTO {
  constructor(mentorData) {
    this.mentor_id = mentorData.mentor_id;
    this.mentor_user_id = mentorData.mentor_user_id;
    this.mentor_name = mentorData.mentor_name;
    this.mentor_email = mentorData.mentor_email;
    this.first_name = mentorData.first_name;
    this.last_name = mentorData.last_name;
    this.contact = mentorData.contact;
    this.gender = mentorData.gender;
    this.dob = mentorData.dob;
    this.expertise = mentorData.expertise;
    this.address = mentorData.address;
    this.city = mentorData.city;
    this.state = mentorData.state;
    this.country = mentorData.country;
    this.mentor_dp = mentorData.mentor_dp;
    this.mentor_social_links = mentorData.mentor_social_links;
    this.mentor_about = mentorData.mentor_about;
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
    this.mentor_email = mentorshipData.mentor_email;
    this.first_name = mentorshipData.first_name;
    this.last_name = mentorshipData.last_name;
    this.contact = mentorshipData.contact;
    this.gender = mentorshipData.gender;
    this.dob = mentorshipData.dob;
    this.expertise = mentorshipData.expertise;
    this.address = mentorshipData.address;
    this.city = mentorshipData.city;
    this.state = mentorshipData.state;
    this.country = mentorshipData.country;
    this.mentor_dp = mentorshipData.mentor_dp;
    this.mentor_social_links = mentorshipData.mentor_social_links;
    this.mentor_about = mentorshipData.mentor_about;
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

class MentorDetailsDTO {
  constructor(detailsData) {
    this.email = detailsData.email;
    this.instructorDetails = detailsData.instructorDetails || {};
    this.courses = detailsData.courses.map(course => ({
      course_id: course.course_id,
      title: course.title,
      short_description: course.short_description,
      thumbnail: course.thumbnail
    }));
    this.events = detailsData.events.map(event => ({
      title: event.title,
      thumbnail: event.thumbnail,
      start_date: event.start_date,
      end_date: event.end_date,
      start_time: event.start_time,
      end_time: event.end_time
    }));
    this.activeMentees = detailsData.activeMentees.map(mentee => ({
      first_name: mentee.first_name,
      last_name: mentee.last_name,
      dp: mentee.dp,
      email: mentee.email
    }));
  }
}

module.exports = {
  MentorDTO,
  MentorshipDTO,
  SessionDTO,
  MentorDetailsDTO
};