class BaseUserDTO {
  constructor(userData) {
    if (!userData.uuid) throw new Error('UUID is required');
    this.uuid = userData.uuid;
    this.email = userData.email;
    this.role_id = userData.role_id;
    this.status = userData.status;
    this.is_deleted = userData.is_deleted;
    this.created_at = userData.created_at;
    this.updated_at = userData.updated_at;
  }
}

class UserProfileDTO {
  constructor(profileData = {}) {
    this.first_name = profileData.first_name || null;
    this.last_name = profileData.last_name || null;
    this.contact = profileData.contact || null;
    this.gender = profileData.gender || null;
    this.dob = profileData.dob || null;
    this.address = profileData.address || null;
    this.city = profileData.city || null;
    this.state = profileData.state || null;
    this.country = profileData.country || null;
    this.dp = profileData.dp || null;
    this.social_links = profileData.social_links || [];
    this.about = profileData.about || null;
    this.resume_url = profileData.resume_url || null;
    this.profile_visibility = profileData.profile_visibility || 'private';
  }
}

class StudentDTO extends BaseUserDTO {
  constructor(userData, studentData) {
    super(userData);
    Object.assign(this, new UserProfileDTO(studentData));
    this.role_type = 'student';
  }
}

class InstructorDTO extends BaseUserDTO {
  constructor(userData, instructorData) {
    super(userData);
    Object.assign(this, new UserProfileDTO(instructorData));
    this.role_type = 'instructor';
  }
}

class AdminDTO extends BaseUserDTO {
  constructor(userData, adminData) {
    super(userData);
    Object.assign(this, new UserProfileDTO(adminData));
    this.role_type = 'admin';
  }
}

class SuperAdminDTO extends BaseUserDTO {
  constructor(userData, superAdminData) {
    super(userData);
    Object.assign(this, new UserProfileDTO(superAdminData));
    this.role_type = 'super_admin';
  }
}

module.exports = {
  StudentDTO,
  InstructorDTO,
  AdminDTO,
  SuperAdminDTO
};