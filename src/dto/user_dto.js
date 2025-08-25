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
    // Format date for HTML date input (YYYY-MM-DD) without timezone conversion
    this.dob = userData.dob ? this.formatDateForInput(userData.dob) : null;
    this.address = userData.address;
    this.city = userData.city;
    this.state = userData.state;
    this.country = userData.country;
    this.specialization = userData.specialization;
    this.expertise = userData.expertise;
    this.dp = userData.dp;
    this.social_links = userData.social_links;
    this.about = userData.about;
    this.resume_url = userData.resume_url;
    this.profile_visibility = userData.profile_visibility;
    this.created_at = userData.created_at;
    this.updated_at = userData.updated_at;
    this.instance = userData.instance;
  }

  // Helper method to format date without timezone conversion
  formatDateForInput(dateValue) {
    if (!dateValue) return null;
    
    // If it's already a string in YYYY-MM-DD format, return as is
    if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
      return dateValue;
    }
    
    // Handle Date object from database (MySQL returns Date objects)
    if (dateValue instanceof Date) {
      const year = dateValue.getFullYear();
      const month = String(dateValue.getMonth() + 1).padStart(2, '0');
      const day = String(dateValue.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    
    // Handle string dates that might need parsing
    if (typeof dateValue === 'string') {
      // If it looks like a date string, try to parse it more carefully
      const dateMatch = dateValue.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (dateMatch) {
        return `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
      }
    }
    
    return null;
  }
}

module.exports = UserDTO;
