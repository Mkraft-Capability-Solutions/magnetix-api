class CourseDTO {
  constructor(courseData) {
    this.id = courseData.id;
    this.title = courseData.title;
    this.shortDescription = courseData.short_description;
    this.description = courseData.description;
    this.languageId = courseData.language_id;
    this.categoryId = courseData.category_id;
    this.subCategoryId = courseData.sub_category_id;
    this.totalLessons = courseData.total_lessons;
    this.level = courseData.level;
    this.courseDuration = courseData.course_duration;
    this.thumbnail = courseData.thumbnail;
    this.courseOverviewProvider = courseData.course_overview_provider;
    this.courseOverviewVideoUrl = courseData.course_overview_video_url;
    this.courseType = courseData.course_type;
    this.status = courseData.status;
    this.metaKeywords = courseData.meta_keywords;
    this.metaDescription = courseData.meta_description;
    this.creatorId = courseData.creator_id;
    this.createdAt = courseData.created_at;
    this.lastUpdated = courseData.last_updated;
    
    // Additional fields for student view
    this.instructorName = courseData.instructor_name;
    this.instructorImage = courseData.instructor_image;
    this.avgRating = courseData.avg_rating || null;
    this.isEnrolled = courseData.is_enrolled || false;
    this.enrollmentDate = courseData.enrollment_date || null;
  }
}

class CourseRatingDTO {
  constructor(ratingData) {
    this.id = ratingData.id;
    this.rating = ratingData.rating;
    this.review = ratingData.review;
    this.userId = ratingData.user_id;
    this.courseId = ratingData.course_id;
    this.dateAdded = ratingData.date_added;
    this.lastModified = ratingData.last_modified;
    this.userName = ratingData.user_name;
    this.userImage = ratingData.user_image;
  }
}

module.exports = {
  CourseDTO,
  CourseRatingDTO
};