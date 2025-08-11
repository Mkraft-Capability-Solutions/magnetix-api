class UserDTO {
  constructor(userData) {
    this.uuid = userData.uuid;
    this.email = userData.email;
    this.role_id = userData.role_id;
    this.status = userData.status;
    this.first_name = userData.first_name;
    this.last_name = userData.last_name;
    this.contact = userData.contact;
    this.gender = userData.gender;
    this.dob = userData.dob;
    this.address = userData.address;
    this.city = userData.city;
    this.state = userData.state;
    this.country = userData.country;
    this.specialization = userData.specialization;
    this.dp = userData.dp;
    this.social_links = userData.social_links;
    this.about = userData.about;
    this.resume_url = userData.resume_url;
    this.profile_visibility = userData.profile_visibility;
    this.created_at = userData.created_at;
    this.updated_at = userData.updated_at;
    this.instance = userData.instance;
  }
}

module.exports = UserDTO;
