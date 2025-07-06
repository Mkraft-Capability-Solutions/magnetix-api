class CourseDTO {
  constructor(courseData) {
    this.id = courseData.id;
    this.title = courseData.title;
    this.short_description = courseData.short_description;
    this.description = courseData.description;
    this.language_id = courseData.language_id;
    this.category_id = courseData.category_id;
    this.sub_category_id = courseData.sub_category_id;
    this.total_lessons = courseData.total_lessons;
    this.level = courseData.level;
    this.course_duration = courseData.course_duration;
    this.thumbnail = courseData.thumbnail;
    this.course_overview_provider = courseData.course_overview_provider;
    this.course_overview_video_url = courseData.course_overview_video_url;
    this.status = courseData.status;
    this.meta_keywords = courseData.meta_keywords;
    this.meta_description = courseData.meta_description;
    this.created_at = courseData.created_at;
    this.instructor_id = courseData.instructor_id;
    this.instructor_name = courseData.instructor_name;
    this.instructor_dp = courseData.instructor_dp;
    this.avg_rating = courseData.avg_rating || 0;
    this.enrolled_date = courseData.enrolled_date;
    this.keyword_match_count = courseData.keyword_match_count || 0;
    this.similarity_score = courseData.similarity_score || 0;
    this.recommendation_type = courseData.recommendation_type || '';
  }
}

class CourseRatingDTO {
  constructor(ratingData) {
    this.id = ratingData.id;
    this.rating = ratingData.rating;
    this.review = ratingData.review;
    this.date_added = ratingData.date_added;
    this.user_id = ratingData.user_id;
    this.user_name = ratingData.user_name;
    this.user_avatar = ratingData.user_avatar;
    this.user_role = ratingData.user_role;
  }
}

class CourseReviewDTO {
  constructor(reviewData) {
    this.id = reviewData.id;
    this.rating = reviewData.rating;
    this.review = reviewData.review;
    this.date_added = reviewData.date_added;
    this.user_id = reviewData.user_id;
    this.user_name = reviewData.user_name;
    this.user_avatar = reviewData.user_avatar;
    this.user_role = reviewData.user_role;
  }
}

class CourseProgressDTO {
  constructor(progressData) {
    this.course_id = progressData.course_id;
    this.course_title = progressData.course_title;
    this.total_lessons = progressData.total_lessons;
    this.total_lessons_available = progressData.total_lessons_available;
    this.lessons_started = progressData.lessons_started;
    this.lessons_completed = progressData.lessons_completed;
    this.progress_percentage = progressData.progress_percentage;
    this.last_accessed = progressData.last_accessed;
    this.last_accessed_lesson_title = progressData.last_accessed_lesson_title;
    this.last_accessed_lesson_id = progressData.last_accessed_lesson_id;
  }
}

module.exports = {
  CourseDTO,
  CourseRatingDTO,
  CourseReviewDTO,
  CourseProgressDTO
};