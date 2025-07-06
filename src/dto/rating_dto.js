
class RatingDTO {
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

class CourseRatingDTO {
  constructor(ratingData) {
    this.course_id = ratingData.course_id;
    this.course_title = ratingData.course_title;
    this.total_ratings = ratingData.total_ratings || 0;
    this.average_rating = ratingData.average_rating || 0;
    this.lowest_rating = ratingData.lowest_rating || 0;
    this.highest_rating = ratingData.highest_rating || 0;
  }
}

class InstructorRatingDTO {
  constructor(ratingData) {
    this.instructor_id = ratingData.instructor_id;
    this.instructor_name = ratingData.instructor_name;
    this.instructor_avatar = ratingData.instructor_avatar;
    this.total_courses = ratingData.total_courses || 0;
    this.total_ratings = ratingData.total_ratings || 0;
    this.average_rating = ratingData.average_rating || 0;
  }
}

module.exports = {
  RatingDTO,
  CourseRatingDTO,
  InstructorRatingDTO
};