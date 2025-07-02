class MentorDTO {
  constructor(mentorData) {
    this.userId = mentorData.user_id;
    this.firstName = mentorData.first_name;
    this.lastName = mentorData.last_name;
    this.contact = mentorData.contact;
    this.gender = mentorData.gender;
    this.dob = mentorData.dob;
    this.address = mentorData.address;
    this.city = mentorData.city;
    this.state = mentorData.state;
    this.country = mentorData.country;
    this.dp = mentorData.dp;
    this.socialLinks = mentorData.social_links ? JSON.parse(mentorData.social_links) : null;
    this.about = mentorData.about;
    this.avgRating = mentorData.avg_rating || null;
    this.status = mentorData.status || null; // For mentorship request status
  }
}

class MentorshipSessionDTO {
  constructor(sessionData) {
    this.id = sessionData.id;
    this.menteeId = sessionData.mentee_id;
    this.mentorId = sessionData.mentor_id;
    this.sessionDate = sessionData.session_date;
    this.sessionTime = sessionData.session_time;
    this.topic = sessionData.topic;
    this.description = sessionData.description;
    this.url = sessionData.url;
    this.status = sessionData.status;
    this.duration = sessionData.duration;
    this.createdDate = sessionData.created_date;
    this.lastUpdated = sessionData.last_updated;
    
    // Additional fields
    this.mentorName = sessionData.mentor_name;
    this.mentorImage = sessionData.mentor_image;
    this.menteeName = sessionData.mentee_name;
    this.menteeImage = sessionData.mentee_image;
  }
}

module.exports = {
  MentorDTO,
  MentorshipSessionDTO
};