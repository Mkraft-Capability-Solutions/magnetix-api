const { promisePool } = require('../../config/db');
const {  
  CourseDTO,
  CourseReviewDTO,
  CourseProgressDTO,
  CourseSkillDTO,
  SkillSummaryDTO,
  CourseRequirementDTO,
  CourseOutcomeDTO,
  CourseFaqDTO,
  CourseSectionDTO,
  CourseDetailDTO,
  CourseLessonDTO,
  RatingStatsDTO
} = require('../../dto/course_dto');
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
      
      // Process the results to ensure all required fields are present
      const recommendations = result[0].map(item => {
        const course = new CourseDTO({
          id: item.course_id,
          title: item.title,
          short_description: item.short_description,
          description: item.short_description, // Fallback to short_description if needed
          level: item.level || 'beginner',
          course_duration: item.course_duration || 0,
          thumbnail: item.thumbnail || '',
          instructor_name: item.instructor_name || 'Unknown Instructor',
          avg_rating: parseFloat(item.avg_rating) || 0,
          keyword_match_count: item.keyword_match_count || 0,
          similarity_score: item.similarity_score || 0,
          recommendation_type: item.recommendation_type || 'general',
          meta_keywords: '', // Add empty meta_keywords to satisfy DTO
          status: 'active' // Default status
        });
        
        return course;
      });
      
      return new ServiceResponseDTO(true, recommendations);
    } catch (error) {
      console.error('Error in getRecommendedCourses:', error);
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
        
        // The result array contains all SELECT outputs from the procedure
        const debugInfo = result.filter(row => row[0] && (row[0].debug || row[0].warning));
        const message = result.find(row => row[0] && row[0].message)[0].message;
        
        return new ServiceResponseDTO(
            true, 
            {
                message: message,
                firstLessonUnlocked: debugInfo.some(info => info[0].debug && info[0].debug.includes('Inserted progress')),
                debug: debugInfo.map(info => info[0])
            }
        );
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

    async saveCourse(userId, courseId) {
    try {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(userId.toLowerCase())) {
        throw new Error('Invalid user UUID format');
      }

      if (!courseId || isNaN(courseId)) {
        throw new Error('Invalid course ID');
      }

      const [result] = await promisePool.query(
        'CALL save_course(?, ?)',
        [userId, courseId]
      );
      
      return new ServiceResponseDTO(true, null, result[0][0].message);
    } catch (error) {
      if (error.code === 'ER_NO_REFERENCED_ROW_2') {
        return new ErrorResponseDTO(new Error('The course or user does not exist'));
      }
      return new ErrorResponseDTO(error);
    }
  }

  async unsaveCourse(userId, courseId) {
    try {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(userId.toLowerCase())) {
        throw new Error('Invalid user UUID format');
      }

      if (!courseId || isNaN(courseId)) {
        throw new Error('Invalid course ID');
      }

      const [result] = await promisePool.query(
        'CALL unsave_course(?, ?)',
        [userId, courseId]
      );
      
      return new ServiceResponseDTO(true, null, result[0][0].message);
    } catch (error) {
      if (error.code === '45000') {
        return new ErrorResponseDTO(new Error(error.sqlMessage));
      }
      return new ErrorResponseDTO(error);
    }
  }

  async getSavedCourses(userId) {
    try {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(userId.toLowerCase())) {
        throw new Error('Invalid user UUID format');
      }

      const [result] = await promisePool.query(
        'CALL get_saved_courses(?)',
        [userId]
      );
      
      const savedCourses = result[0].map(course => new CourseDTO(course));
      return new ServiceResponseDTO(true, savedCourses);
    } catch (error) {
      return new ErrorResponseDTO(error);
    }
  }

  async isCourseSaved(userId, courseId) {
    try {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(userId.toLowerCase())) {
        throw new Error('Invalid user UUID format');
      }

      if (!courseId || isNaN(courseId)) {
        throw new Error('Invalid course ID');
      }

      const [result] = await promisePool.query(
        'CALL is_course_saved(?, ?)',
        [userId, courseId]
      );
      
      const isSaved = result[0][0].is_saved === 1;
      return new ServiceResponseDTO(true, { is_saved: isSaved });
    } catch (error) {
      return new ErrorResponseDTO(error);
    }
  }


  async getCourseSkills(courseId) {
  try {
    const [result] = await promisePool.query('CALL get_course_skills(?)', [courseId]);
    const skills = result[0].map(skill => new CourseSkillDTO(skill));
    return new ServiceResponseDTO(true, skills);
  } catch (error) {
    return new ErrorResponseDTO(error);
  }
}

async getTotalAchievedSkills(studentId) {
  try {
    const [result] = await promisePool.query('CALL get_total_achieved_skills(?)', [studentId]);
    
    const response = {
      skills: result[0].map(skill => new CourseSkillDTO(skill)),
      total_count: result[1][0].total_skills_count || 0
    };
    
    return new ServiceResponseDTO(true, new SkillSummaryDTO(response));
  } catch (error) {
    return new ErrorResponseDTO(error);
  }
}

async getGainedSkillsByCourse(studentId, courseId) {
  try {
    const [result] = await promisePool.query(
      'CALL get_gained_skills_by_course(?, ?)', 
      [studentId, courseId]
    );
    
    const response = {
      skills: result[0].map(skill => new CourseSkillDTO(skill)),
      total_count: result[1][0].gained_skills_count || 0
    };
    
    return new ServiceResponseDTO(true, new SkillSummaryDTO(response));
  } catch (error) {
    return new ErrorResponseDTO(error);
  }
}

async getRemainingSkillsByCourse(studentId, courseId) {
  try {
    const [result] = await promisePool.query(
      'CALL get_remaining_skills_by_course(?, ?)', 
      [studentId, courseId]
    );
    
    const response = {
      skills: result[0].map(skill => new CourseSkillDTO(skill)),
      total_count: result[1][0].remaining_skills_count || 0
    };
    
    return new ServiceResponseDTO(true, new SkillSummaryDTO(response));
  } catch (error) {
    return new ErrorResponseDTO(error);
  }
}

async checkEnrollment(userId, courseId) {
  try {
    const [result] = await promisePool.query(
      'CALL check_course_enrollment(?, ?)',
      [userId, courseId]
    );
    return new ServiceResponseDTO(true, { is_enrolled: result[0][0].is_enrolled });
  } catch (error) {
    return new ErrorResponseDTO(error);
  }
}

async getCourseBasicDetails(courseId) {
  try {
    const [results] = await promisePool.query(
      'CALL get_course_basic_details(?)',
      [courseId]
    );
    
    // Process multiple result sets
    const courseInfo = results[0][0];
    const requirements = results[1];
    const outcomes = results[2];
    const faqs = results[3];
    const skills = results[4];
    const sections = results[5];
    const contentLessons = results[6];
    const iltsLessons = results[7];
    const reviews = results[8];
    const ratingStats = results[9][0];
    
    // Combine all lessons
    const allLessons = [...contentLessons, ...iltsLessons];
    
    return new ServiceResponseDTO(true, {
      ...courseInfo,
      requirements: requirements.map(req => new CourseRequirementDTO(req)),
      outcomes: outcomes.map(out => new CourseOutcomeDTO(out)),
      faqs: faqs.map(faq => new CourseFaqDTO(faq)),
      skills: skills.map(skill => new CourseSkillDTO(skill)),
      sections: sections.map(section => new CourseSectionDTO(section)),
      lessons: allLessons.map(lesson => new CourseLessonDTO(lesson)),
      reviews: reviews.map(review => new CourseReviewDTO(review)),
      rating_stats: new RatingStatsDTO(ratingStats),
      is_enrolled: false
    });
  } catch (error) {
    return new ErrorResponseDTO(error);
  }
}

async getEnrolledCourseDetails(userId, courseId) {
  try {
    const [results] = await promisePool.query(
      'CALL get_course_enrolled_details(?, ?)',
      [userId, courseId]
    );
    
    // First result sets are from get_course_basic_details
    const courseInfo = results[0][0];
    const requirements = results[1];
    const outcomes = results[2];
    const faqs = results[3];
    const skills = results[4];
    const sections = results[5];
    const contentLessons = results[6];
    const iltsLessons = results[7];
    const reviews = results[8];
    const ratingStats = results[9][0];
    
    // Additional result sets for enrolled details
    const lessonsWithProgress = results[10];
    const progressSummary = results[11][0];
    const achievedSkills = results[12];
    
    // Combine all lessons
    const allLessons = [...contentLessons, ...iltsLessons];
    
    return new ServiceResponseDTO(true, {
      ...courseInfo,
      requirements: requirements.map(req => new CourseRequirementDTO(req)),
      outcomes: outcomes.map(out => new CourseOutcomeDTO(out)),
      faqs: faqs.map(faq => new CourseFaqDTO(faq)),
      skills: skills.map(skill => new CourseSkillDTO(skill)),
      sections: sections.map(section => new CourseSectionDTO(section)),
      lessons: lessonsWithProgress.map(lesson => new CourseLessonDTO(lesson)),
      reviews: reviews.map(review => new CourseReviewDTO(review)),
      rating_stats: new RatingStatsDTO(ratingStats),
      progress: new CourseProgressDTO(progressSummary),
      achieved_skills: achievedSkills.map(skill => new CourseSkillDTO(skill)),
      is_enrolled: true
    });
  } catch (error) {
    return new ErrorResponseDTO(error);
  }
}

async getCourseDetails(userId, courseId) {
  try {
    // First check enrollment status
    const enrollmentCheck = await this.checkEnrollment(userId, courseId);
    if (!enrollmentCheck.success) {
      return enrollmentCheck;
    }
    
    // Return appropriate details based on enrollment
    if (enrollmentCheck.data.is_enrolled) {
      return await this.getEnrolledCourseDetails(userId, courseId);
    }
    return await this.getCourseBasicDetails(courseId);
  } catch (error) {
    return new ErrorResponseDTO(error);
  }
}

async markLessonCompleted(userId, lessonId, courseId) {
    try {
        const [result] = await promisePool.query(
            'CALL mark_lesson_completed(?, ?, ?)',
            [userId, lessonId, courseId]
        );
        
        return new ServiceResponseDTO(true, {
            message: result[0][0].message,
            nextLessonUnlocked: result[1] ? result[1][0] : null
        });
    } catch (error) {
        if (error.code === 'ER_SIGNAL_EXCEPTION') {
            return new ErrorResponseDTO(new Error(error.sqlMessage));
        }
        return new ErrorResponseDTO(error);
    }
}

}

module.exports = new CourseService();