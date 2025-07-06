const { promisePool } = require('../../config/db');

class CourseService {
  async getSubscribedCourses(studentId) {
    const [result] = await promisePool.query('CALL get_student_subscribed_courses(?)', [studentId]);
    return result[0];
  }

  async exploreCourses(studentId) {
    const [result] = await promisePool.query('CALL get_explore_courses(?)', [studentId]);
    return result[0];
    }

    async getCourseReviews(courseId) {
    try {
        const [result] = await promisePool.query('CALL get_course_reviews_with_users(?)', [courseId]);
        return result[0] || []; // Return empty array if no reviews
    } catch (error) {
        if (error.code === 'ER_SP_DOES_NOT_EXIST') {
        throw new Error('Course reviews procedure not found. Please contact admin.');
        }
        throw error;
    }
    }

    async getInstructorRating(instructorId) {
    try {
        const [result] = await promisePool.query('CALL get_instructor_avg_rating(?)', [instructorId]);
        return result[0][0] || {
        instructor_id: instructorId,
        instructor_name: '',
        instructor_avatar: null,
        total_courses: 0,
        total_ratings: 0,
        average_rating: 0
        };
    } catch (error) {
        if (error.code === 'ER_SP_DOES_NOT_EXIST') {
        throw new Error('Instructor rating procedure not found. Please contact admin.');
        }
        throw error;
    }
    }

    async getCourseRating(courseId) {
    try {
        const [result] = await promisePool.query('CALL get_course_avg_rating(?)', [courseId]);
        return result[0][0] || {
        course_id: courseId,
        course_title: '',
        total_ratings: 0,
        average_rating: 0,
        lowest_rating: 0,
        highest_rating: 0
        };
    } catch (error) {
        if (error.code === 'ER_SP_DOES_NOT_EXIST') {
        throw new Error('Course rating procedure not found. Please contact admin.');
        }
        throw error;
    }
    }

  async getRecommendedCourses(studentId) {
        const [result] = await promisePool.query('CALL get_recommended_courses(?)', [studentId]);
        
        // Format the result to match the PHP version's structure
        return result[0].map(course => ({
        course: {
            id: course.course_id,
            title: course.title,
            short_description: course.short_description,
            thumbnail: course.thumbnail,
            instructor_name: course.instructor_name,
            avg_rating: course.avg_rating,
            // Add other necessary course fields
        },
        score: course.similarity_score,
        type: course.recommendation_type,
        keyword_match_count: course.keyword_match_count
        }));
    }

    async enrollInCourse(studentId, courseId) {
        // Normalize UUID to lowercase for consistency
        const normalizedStudentId = studentId.toLowerCase();
        
        // Validate UUID format
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(normalizedStudentId)) {
            throw new Error('Invalid student UUID format');
        }

        try {
            const [result] = await promisePool.query(
                'CALL enroll_student_in_course(?, ?)', 
                [normalizedStudentId, courseId]
            );
            return result[0][0];
        } catch (error) {
            // More specific error handling
            if (error.code === 'ER_SIGNAL_EXCEPTION') {
                throw new Error(error.sqlMessage);
            } else if (error.code === 'ER_NO_REFERENCED_ROW_2') {
                throw new Error('The course or student does not exist');
            }
            throw error;
        }
    }
}

module.exports = new CourseService();