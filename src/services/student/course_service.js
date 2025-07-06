const { promisePool } = require('../../config/db');
const { CourseDTO, CourseRatingDTO, CourseReviewDTO, CourseProgressDTO  } = require('../../dto/course_dto');
const { ServiceResponseDTO, ErrorResponseDTO } = require('../../dto/response_dto');

class CourseService {
  async getSubscribedCourses(studentId) {
    try {
      const [result] = await promisePool.query('CALL get_student_subscribed_courses(?)', [studentId]);
      const courses = result[0].map(course => new CourseDTO(course));
      return new ServiceResponseDTO(true, courses);
    } catch (error) {
      return new ErrorResponseDTO(error);
    }
  }

  async exploreCourses(studentId) {
    try {
      const [result] = await promisePool.query('CALL get_explore_courses(?)', [studentId]);
      const courses = result[0].map(course => new CourseDTO(course));
      return new ServiceResponseDTO(true, courses);
    } catch (error) {
      return new ErrorResponseDTO(error);
    }
  }

  async getCourseReviews(courseId) {
    try {
      const [result] = await promisePool.query('CALL get_course_reviews_with_users(?)', [courseId]);
      const reviews = result[0].map(review => new CourseReviewDTO(review));
      return new ServiceResponseDTO(true, reviews);
    } catch (error) {
      if (error.code === 'ER_SP_DOES_NOT_EXIST') {
        return new ErrorResponseDTO(new Error('Course reviews procedure not found. Please contact admin.'));
      }
      return new ErrorResponseDTO(error);
    }
  }

  async getInstructorRating(instructorId) {
    try {
      const [result] = await promisePool.query('CALL get_instructor_avg_rating(?)', [instructorId]);
      const rating = result[0][0] || {
        instructor_id: instructorId,
        instructor_name: '',
        instructor_avatar: null,
        total_courses: 0,
        total_ratings: 0,
        average_rating: 0
      };
      return new ServiceResponseDTO(true, rating);
    } catch (error) {
      if (error.code === 'ER_SP_DOES_NOT_EXIST') {
        return new ErrorResponseDTO(new Error('Instructor rating procedure not found. Please contact admin.'));
      }
      return new ErrorResponseDTO(error);
    }
  }

  async getCourseRating(courseId) {
    try {
      const [result] = await promisePool.query('CALL get_course_avg_rating(?)', [courseId]);
      const rating = result[0][0] || {
        course_id: courseId,
        course_title: '',
        total_ratings: 0,
        average_rating: 0,
        lowest_rating: 0,
        highest_rating: 0
      };
      return new ServiceResponseDTO(true, rating);
    } catch (error) {
      if (error.code === 'ER_SP_DOES_NOT_EXIST') {
        return new ErrorResponseDTO(new Error('Course rating procedure not found. Please contact admin.'));
      }
      return new ErrorResponseDTO(error);
    }
  }

  async getRecommendedCourses(studentId) {
    try {
      const [result] = await promisePool.query('CALL get_recommended_courses(?)', [studentId]);
      const recommendations = result[0].map(item => ({
        course: new CourseDTO(item),
        score: item.similarity_score,
        type: item.recommendation_type,
        keyword_match_count: item.keyword_match_count
      }));
      return new ServiceResponseDTO(true, recommendations);
    } catch (error) {
      return new ErrorResponseDTO(error);
    }
  }

  async enrollInCourse(studentId, courseId) {
    try {
      const normalizedStudentId = studentId.toLowerCase();
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(normalizedStudentId)) {
        throw new Error('Invalid student UUID format');
      }

      const [result] = await promisePool.query(
        'CALL enroll_student_in_course(?, ?)', 
        [normalizedStudentId, courseId]
      );
      return new ServiceResponseDTO(true, null, result[0][0].message || 'Successfully enrolled in the course');
    } catch (error) {
      if (error.code === 'ER_SIGNAL_EXCEPTION') {
        return new ErrorResponseDTO(new Error(error.sqlMessage));
      } else if (error.code === 'ER_NO_REFERENCED_ROW_2') {
        return new ErrorResponseDTO(new Error('The course or student does not exist'));
      }
      return new ErrorResponseDTO(error);
    }
  }
  
  async getCourseProgress(studentId, courseId) {
    try {
        const [result] = await promisePool.query(
        'CALL get_course_progress(?, ?)',
        [studentId, courseId]
        );
        
        if (result.length === 0) {
        return new ErrorResponseDTO(new Error('No progress data found'));
        }
        
        const progress = new CourseProgressDTO(result[0][0]);
        return new ServiceResponseDTO(true, progress);
    } catch (error) {
        if (error.code === 'ER_SIGNAL_EXCEPTION') {
        return new ErrorResponseDTO(new Error(error.sqlMessage));
        }
        return new ErrorResponseDTO(error);
    }
    }

    async getLastAccessedCourse(studentId) {
        try {
            const [result] = await promisePool.query(
            'CALL get_last_access_course(?)',
            [studentId]
            );
            
            if (result.length === 0 || result[0][0].course_id === null) {
            return new ServiceResponseDTO(true, {
                message: 'No course progress found for this student'
            });
            }
            
            const progress = new CourseProgressDTO(result[0][0]);
            return new ServiceResponseDTO(true, progress);
        } catch (error) {
            return new ErrorResponseDTO(error);
        }
    }
}

module.exports = new CourseService();