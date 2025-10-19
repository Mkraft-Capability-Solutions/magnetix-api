/**
 * DTO for complete instructor profile data
 */
class InstructorProfileDTO {
  constructor(profileData, courses = [], events = [], reviews = [], availability = null) {
    // Basic instructor information
    this.id = profileData.id;
    this.instructorUuid = profileData.instructor_uuid;
    this.firstName = profileData.first_name;
    this.lastName = profileData.last_name;
    this.fullName = profileData.full_name;
    this.email = profileData.email;
    this.contact = profileData.contact;
    this.gender = profileData.gender;
    this.dob = profileData.dob;
    this.address = profileData.address;
    this.city = profileData.city;
    this.state = profileData.state;
    this.country = profileData.country;
    this.dp = profileData.dp;
    this.about = profileData.about;
    this.resumeUrl = profileData.resume_url;
    this.profileVisibility = profileData.profile_visibility;
    this.isFeatured = profileData.is_featured === 1 || profileData.is_featured === true;

    // Parse social links
    this.socialLinks = this.parseSocialLinks(profileData.social_links);

    // Parse expertise (comma-separated string to array)
    this.expertise = this.parseExpertise(profileData.expertise);

    // Parse experience (JSON to array of objects)
    this.experience = this.parseExperience(profileData.experience);

    // Statistics
    this.averageRating = parseFloat(profileData.average_rating) || 0;
    this.totalReviews = parseInt(profileData.total_reviews) || 0;
    this.totalMentees = parseInt(profileData.total_mentees) || 0;
    this.totalCourses = parseInt(profileData.total_courses) || 0;
    this.totalEvents = parseInt(profileData.total_events) || 0;

    // Related data
    this.courses = courses.map(course => new CourseDTO(course));
    this.events = events.map(event => new EventDTO(event));
    this.reviews = reviews.map(review => new ReviewDTO(review));
    this.availability = availability ? new AvailabilityDTO(availability) : null;
  }

  parseSocialLinks(socialLinksData) {
    if (!socialLinksData) return {};

    try {
      // If already an object, return it
      if (typeof socialLinksData === 'object' && !Array.isArray(socialLinksData)) {
        return socialLinksData;
      }

      // If it's a string, try to parse it
      if (typeof socialLinksData === 'string') {
        // Trim whitespace
        const trimmed = socialLinksData.trim();

        // If empty string, return empty object
        if (!trimmed) return {};

        // Check if it looks like JSON (starts with { or [)
        if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
          return JSON.parse(trimmed);
        }

        // If it's a plain URL string, treat it as a generic link
        // This handles legacy data where social_links might be a single URL
        if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
          return {
            website: trimmed
          };
        }

        // Try to parse anyway (in case it's JSON without leading brace)
        try {
          return JSON.parse(trimmed);
        } catch {
          // If all else fails, treat it as a generic link
          return {
            other: trimmed
          };
        }
      }

      // If it's an array (shouldn't happen, but handle it)
      if (Array.isArray(socialLinksData)) {
        return {};
      }

      return {};
    } catch (error) {
      console.error('Error parsing social links:', error);
      console.error('Social links data:', socialLinksData);
      // Return empty object on error to prevent crashes
      return {};
    }
  }

  parseExpertise(expertiseData) {
    if (!expertiseData) return [];

    if (typeof expertiseData === 'string') {
      // Split by comma and trim whitespace
      return expertiseData.split(',').map(skill => skill.trim()).filter(skill => skill.length > 0);
    }

    if (Array.isArray(expertiseData)) {
      return expertiseData;
    }

    return [];
  }

  parseExperience(experienceData) {
    if (!experienceData) return [];

    try {
      if (typeof experienceData === 'string') {
        return JSON.parse(experienceData);
      }
      if (Array.isArray(experienceData)) {
        return experienceData;
      }
      return [];
    } catch (error) {
      console.error('Error parsing experience:', error);
      return [];
    }
  }
}

/**
 * DTO for course data in instructor profile
 */
class CourseDTO {
  constructor(data) {
    this.id = data.id;
    this.title = data.title;
    this.shortDescription = data.short_description;
    this.description = data.description;
    this.thumbnail = data.thumbnail;
    this.level = data.level;
    this.courseDuration = data.course_duration;
    this.status = data.status;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
    this.averageRating = parseFloat(data.average_rating) || 0;
    this.totalRatings = parseInt(data.total_ratings) || 0;
    this.totalEnrollments = parseInt(data.total_enrollments) || 0;
  }
}

/**
 * DTO for event data in instructor profile
 */
class EventDTO {
  constructor(data) {
    this.id = data.id;
    this.title = data.title;
    this.description = data.description;
    this.startDate = data.start_date;
    this.startTime = data.start_time;
    this.endDate = data.end_date;
    this.endTime = data.end_time;
    this.eventThumbnail = data.event_thumbnail;
    this.onlineEvent = data.online_event === 1 || data.online_event === true;
    this.eventVenue = data.event_venue;
    this.maxLimit = data.max_limit;
    this.attendeesCount = data.attendees_count;
    this.createdDate = data.created_date;
    this.eventCategory = data.event_category;
    this.speakers = data.speakers;
  }
}

/**
 * DTO for review/rating data in instructor profile
 */
class ReviewDTO {
  constructor(data) {
    this.id = data.id;
    this.rating = parseFloat(data.rating);
    this.review = data.review;
    this.createdAt = data.created_at;
    this.studentUuid = data.student_uuid;
    this.studentFirstName = data.student_first_name;
    this.studentLastName = data.student_last_name;
    this.studentName = data.student_name;
    this.studentDp = data.student_dp;
  }
}

/**
 * DTO for availability data in instructor profile
 */
class AvailabilityDTO {
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

module.exports = {
  InstructorProfileDTO,
  CourseDTO,
  EventDTO,
  ReviewDTO,
  AvailabilityDTO
};
