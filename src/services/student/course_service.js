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
const achievementsService = require('./achievements_service');
const certificationService = require('../admin/certification_service');
const { calculateAssessmentScore } = require('../admin/feedback_service');
const geminiAIService = require('../gemini/gemini_ai_service');

class CourseService {
  async getSubscribedCourses(studentId) {
    try {
      // Direct SQL query to filter only active courses
      const query = `
        SELECT
          c.id,
          c.title,
          c.short_description,
          c.thumbnail,
          c.level,
          c.category_id,
          COALESCE(cat.category_name, '') as category_name,
          e.enrolled_date,
          (SELECT COUNT(*) FROM course_lesson WHERE course_id = c.id) as total_lessons,
          (SELECT COUNT(*) FROM course_progress cp WHERE cp.enroll_id = e.id AND cp.lesson_completed = 1) as completedLessons
        FROM enrol e
        INNER JOIN course c ON e.course_id = c.id
        LEFT JOIN category cat ON c.category_id = cat.id
        WHERE e.user_id = ? AND c.is_deleted = 0 AND c.status = 'active'
        ORDER BY e.enrolled_date DESC
      `;

      const [courses] = await promisePool.query(query, [studentId]);

      // For each course, calculate total duration from lessons
      const coursesWithDuration = await Promise.all(courses.map(async (course) => {
        const [lessons] = await promisePool.query(
          'SELECT lesson_duration FROM course_lesson WHERE course_id = ?',
          [course.id]
        );

        // Parse and sum lesson durations
        let totalMinutes = 0;
        lessons.forEach(lesson => {
          if (lesson.lesson_duration) {
            const duration = lesson.lesson_duration.toLowerCase();

            // Extract hours
            const hoursMatch = duration.match(/(\d+)\s*(hour|hr)/);
            if (hoursMatch) {
              totalMinutes += parseInt(hoursMatch[1]) * 60;
            }

            // Extract minutes
            const minsMatch = duration.match(/(\d+)\s*(minute|min)/);
            if (minsMatch) {
              totalMinutes += parseInt(minsMatch[1]);
            }

            // If no hours or minutes found, try just a number
            if (!hoursMatch && !minsMatch) {
              const numMatch = duration.match(/(\d+)/);
              if (numMatch) {
                totalMinutes += parseInt(numMatch[1]);
              }
            }
          }
        });

        // Format duration string
        let course_duration;
        if (totalMinutes === 0) {
          course_duration = '0 mins';
        } else if (totalMinutes < 60) {
          course_duration = `${totalMinutes} mins`;
        } else {
          const hours = Math.floor(totalMinutes / 60);
          const mins = totalMinutes % 60;
          if (mins === 0) {
            course_duration = hours === 1 ? `${hours} hr` : `${hours} hrs`;
          } else {
            course_duration = `${hours} hr ${mins} mins`;
          }
        }

        return {
          ...course,
          course_duration
        };
      }));

      const courseDTOs = coursesWithDuration.map(course => new CourseDTO(course));
      return new ServiceResponseDTO(true, courseDTOs);
    } catch (error) {
      return new ErrorResponseDTO(error);
    }
  }

  async exploreCourses(studentId) {
    try {
      // First get basic course info
      const query = `
        SELECT
          c.id,
          c.title,
          c.short_description,
          c.thumbnail,
          c.level,
          c.category_id,
          COALESCE(cat.category_name, '') as category_name,
          c.creator_id,
          c.created_at,
          (SELECT COUNT(*) FROM enrol e WHERE e.course_id = c.id) as enrollmentCount,
          (SELECT COUNT(*) FROM course_lesson cl WHERE cl.course_id = c.id) as total_lessons,
          EXISTS(SELECT 1 FROM saved_courses sc WHERE sc.user_id = ? AND sc.course_id = c.id) as isSaved
        FROM course c
        LEFT JOIN category cat ON c.category_id = cat.id
        WHERE c.status = 'active'
          AND c.is_deleted = 0
          AND NOT EXISTS (SELECT 1 FROM enrol e WHERE e.user_id = ? AND e.course_id = c.id)
        ORDER BY c.created_at DESC
      `;

      const [courses] = await promisePool.query(query, [studentId, studentId]);

      // For each course, calculate total duration from lessons
      const coursesWithDuration = await Promise.all(courses.map(async (course) => {
        const [lessons] = await promisePool.query(
          'SELECT lesson_duration FROM course_lesson WHERE course_id = ?',
          [course.id]
        );

        // Parse and sum lesson durations
        let totalMinutes = 0;
        lessons.forEach(lesson => {
          if (lesson.lesson_duration) {
            const duration = lesson.lesson_duration.toLowerCase();

            // Extract hours
            const hoursMatch = duration.match(/(\d+)\s*(hour|hr)/);
            if (hoursMatch) {
              totalMinutes += parseInt(hoursMatch[1]) * 60;
            }

            // Extract minutes
            const minsMatch = duration.match(/(\d+)\s*(minute|min)/);
            if (minsMatch) {
              totalMinutes += parseInt(minsMatch[1]);
            }

            // If no hours or minutes found, try just a number
            if (!hoursMatch && !minsMatch) {
              const numMatch = duration.match(/(\d+)/);
              if (numMatch) {
                totalMinutes += parseInt(numMatch[1]);
              }
            }
          }
        });

        // Format duration string
        let course_duration;
        if (totalMinutes === 0) {
          course_duration = '0 mins';
        } else if (totalMinutes < 60) {
          course_duration = `${totalMinutes} mins`;
        } else {
          const hours = Math.floor(totalMinutes / 60);
          const mins = totalMinutes % 60;
          if (mins === 0) {
            course_duration = hours === 1 ? `${hours} hr` : `${hours} hrs`;
          } else {
            course_duration = `${hours} hr ${mins} mins`;
          }
        }

        return {
          ...course,
          course_duration
        };
      }));

      const courseDTOs = coursesWithDuration.map(course => new CourseDTO(course));
      return new ServiceResponseDTO(true, courseDTOs);
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

        // Award points for course enrollment
        await achievementsService.awardPoints(
            normalizedStudentId,
            5,
            0,
            'course_enroll',
            'enrollment',
            courseId,
            `Enrolled in course ID: ${courseId}`
        );

        // Auto-enroll in certifications that include this course
        try {
            const certEnrollmentResult = await certificationService.autoEnrollInCertifications(normalizedStudentId, courseId);
            console.log('✅ Certification auto-enrollment result:', certEnrollmentResult);
        } catch (certError) {
            console.error('❌ Error auto-enrolling in certifications:', certError);
            // Don't fail the course enrollment if certification enrollment fails
        }

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

      // Award points for saving a course
      await achievementsService.awardPoints(
        userId,
        2,
        0,
        'course_save',
        'saved_course',
        courseId,
        `Saved course ID: ${courseId}`
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

      // Direct SQL query to filter only active courses
      const query = `
        SELECT
          c.id,
          c.title,
          c.short_description,
          c.thumbnail,
          c.level,
          c.category_id,
          COALESCE(cat.category_name, '') as category_name,
          sc.saved_date,
          (SELECT COUNT(*) FROM enrol WHERE course_id = c.id) as enrollmentCount,
          (SELECT COUNT(*) FROM course_lesson WHERE course_id = c.id) as total_lessons,
          EXISTS(SELECT 1 FROM enrol WHERE user_id = ? AND course_id = c.id) as isEnrolled
        FROM saved_courses sc
        INNER JOIN course c ON sc.course_id = c.id
        LEFT JOIN category cat ON c.category_id = cat.id
        WHERE sc.user_id = ? AND sc.course_saved = 1 AND c.is_deleted = 0 AND c.status = 'active'
        ORDER BY sc.saved_date DESC
      `;

      const [savedCourses] = await promisePool.query(query, [userId, userId]);

      // For each course, calculate total duration from lessons
      const coursesWithDuration = await Promise.all(savedCourses.map(async (course) => {
        const [lessons] = await promisePool.query(
          'SELECT lesson_duration FROM course_lesson WHERE course_id = ?',
          [course.id]
        );

        // Parse and sum lesson durations
        let totalMinutes = 0;
        lessons.forEach(lesson => {
          if (lesson.lesson_duration) {
            const duration = lesson.lesson_duration.toLowerCase();

            // Extract hours
            const hoursMatch = duration.match(/(\d+)\s*(hour|hr)/);
            if (hoursMatch) {
              totalMinutes += parseInt(hoursMatch[1]) * 60;
            }

            // Extract minutes
            const minsMatch = duration.match(/(\d+)\s*(minute|min)/);
            if (minsMatch) {
              totalMinutes += parseInt(minsMatch[1]);
            }

            // If no hours or minutes found, try just a number
            if (!hoursMatch && !minsMatch) {
              const numMatch = duration.match(/(\d+)/);
              if (numMatch) {
                totalMinutes += parseInt(numMatch[1]);
              }
            }
          }
        });

        // Format duration string
        let course_duration;
        if (totalMinutes === 0) {
          course_duration = '0 mins';
        } else if (totalMinutes < 60) {
          course_duration = `${totalMinutes} mins`;
        } else {
          const hours = Math.floor(totalMinutes / 60);
          const mins = totalMinutes % 60;
          if (mins === 0) {
            course_duration = hours === 1 ? `${hours} hr` : `${hours} hrs`;
          } else {
            course_duration = `${hours} hr ${mins} mins`;
          }
        }

        return {
          ...course,
          course_duration
        };
      }));

      const courseDTOs = coursesWithDuration.map(course => new CourseDTO(course));
      return new ServiceResponseDTO(true, courseDTOs);
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
    // Update last_accessed timestamp for enrolled users viewing the course
    // COMMENTED OUT: last_accessed column doesn't exist in enrol table
    // await promisePool.query(
    //   'UPDATE enrol SET last_accessed = NOW() WHERE user_id = ? AND course_id = ?',
    //   [userId, courseId]
    // );

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

async getLessonById(courseId, lessonId, userId) {
  console.log("getLessonById called with courseId:", courseId, "lessonId:", lessonId, "userId:", userId);

  try {
    const [lessons] = await promisePool.query(
      `SELECT l.*, s.title as section_title, ff.name as assessment_name
      FROM course_lesson l
      LEFT JOIN course_section s ON l.section_id = s.id
      LEFT JOIN feedback_forms ff ON l.assessment_id = ff.id
      WHERE l.id = ? AND l.course_id = ?`,
      [lessonId, courseId]
    );

    if (lessons.length === 0) {
      throw new Error("Lesson not found");
    }

    const lesson = lessons[0];

    // Check if the lesson is completed by the user
    let isCompleted = false;
    if (userId) {
      const [progress] = await promisePool.query(
        `SELECT cp.lesson_completed
        FROM course_progress cp
        INNER JOIN enrol e ON cp.enroll_id = e.id
        WHERE e.user_id = ? AND e.course_id = ? AND cp.lesson_id = ?`,
        [userId, courseId, lessonId]
      );

      console.log('Lesson completion check - progress result:', progress);
      console.log('Progress length:', progress.length);
      if (progress.length > 0) {
        console.log('lesson_completed value:', progress[0].lesson_completed);
      }

      if (progress.length > 0 && progress[0].lesson_completed === 1) {
        isCompleted = true;
      }
      console.log('Final isCompleted value:', isCompleted);
    }

    // Build base response
    const result = {
      id: lesson.id,
      title: lesson.title,
      section: lesson.section_title,
      sectionId: lesson.section_id,
      lessonType: lesson.lesson_type,
      lessonOrder: lesson.lesson_order,
      contentType: lesson.lesson_content_type,
      lessonContentDocument: lesson.lesson_content_document,
      lesson_content_scorm: lesson.lesson_content_scorm,
      lesson_content_mp4: lesson.lesson_content_mp4,
      lesson_content_url: lesson.lesson_content_url,
      lessonDuration: lesson.lesson_duration,
      duration: lesson.lesson_duration,
      description: lesson.description,
      skills: lesson.skills ? JSON.parse(lesson.skills) : [],
      iltsType: lesson.ilts_type,
      iltsUrl: lesson.ilts_url,
      startDate: lesson.start_date,
      startTime: lesson.start_time,
      endDate: lesson.end_date,
      endTime: lesson.end_time,
      eventVenue: lesson.event_venue,
      meetUrl: lesson.meet_url,
      isCompleted: isCompleted,
      // Quiz/Assessment fields
      assessmentId: lesson.assessment_id || null,
      assessmentName: lesson.assessment_name || null,
      requireSectionCompletion: !!lesson.require_section_completion,
      assessmentStartDate: lesson.assessment_start_date || null,
      assessmentEndDate: lesson.assessment_end_date || null,
    };

    // If this is a quiz lesson, compute access control
    if (lesson.lesson_content_type === 'quiz' && userId) {
      let quizAccessible = true;
      const denyReasons = [];

      // Check section completion requirement
      if (lesson.require_section_completion) {
        const [sectionLessons] = await promisePool.query(
          `SELECT
            COUNT(*) as totalLessons,
            SUM(CASE WHEN cp.lesson_completed = 1 THEN 1 ELSE 0 END) as completedLessons
          FROM course_lesson cl
          LEFT JOIN course_progress cp ON cl.id = cp.lesson_id
            AND cp.enroll_id = (SELECT id FROM enrol WHERE user_id = ? AND course_id = ? LIMIT 1)
          WHERE cl.section_id = ? AND cl.course_id = ? AND cl.id != ?
            AND (cl.lesson_content_type IS NULL OR cl.lesson_content_type != 'quiz')`,
          [userId, courseId, lesson.section_id, courseId, lessonId]
        );

        const total = sectionLessons[0].totalLessons || 0;
        const completed = sectionLessons[0].completedLessons || 0;
        const allCompleted = total > 0 && completed >= total;

        result.sectionLessonsCompleted = allCompleted;
        result.totalSectionLessons = total;
        result.completedSectionLessons = completed;

        if (!allCompleted) {
          quizAccessible = false;
          denyReasons.push(`Complete all lessons in this section first (${completed}/${total} completed).`);
        }
      }

      // Check date range restriction
      if (lesson.assessment_start_date || lesson.assessment_end_date) {
        const now = new Date();

        if (lesson.assessment_start_date) {
          const startDate = new Date(lesson.assessment_start_date);
          if (now < startDate) {
            quizAccessible = false;
            denyReasons.push(`This assessment opens on ${startDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}.`);
          }
        }

        if (lesson.assessment_end_date) {
          const endDate = new Date(lesson.assessment_end_date);
          // Set end date to end of day
          endDate.setHours(23, 59, 59, 999);
          if (now > endDate) {
            quizAccessible = false;
            denyReasons.push(`This assessment closed on ${new Date(lesson.assessment_end_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}.`);
          }
        }
      }

      result.quizAccessible = quizAccessible;
      result.quizAccessDeniedReason = denyReasons.length > 0 ? denyReasons.join(' ') : null;
    }

    return result;
  } catch (error) {
    console.error("Error in getLessonById:", error);
    throw error;
  }
}

async markLessonCompleted(userId, lessonId, courseId) {
    try {
        const [result] = await promisePool.query(
            'CALL mark_lesson_completed(?, ?, ?)',
            [userId, lessonId, courseId]
        );

        // Award points for lesson completion
        await achievementsService.awardPoints(
            userId,
            10,
            0,
            'lesson_complete',
            'lesson',
            lessonId,
            `Completed lesson ID: ${lessonId}`
        );

        // Check if course is now complete
        const progressCheck = await this.getCourseProgress(userId, courseId);
        if (progressCheck.success && progressCheck.data.completion_percentage === 100) {
            // Award course completion points and XP
            await achievementsService.awardPoints(
                userId,
                100,
                50,
                'course_complete',
                'enrollment',
                courseId,
                `Completed course ID: ${courseId}`
            );

            // Check for certification completion and auto-issue certificates
            try {
                const certCheckResult = await certificationService.autoCheckCertificationsForUser(userId, courseId);
                console.log('✅ Certification completion check result:', certCheckResult);
            } catch (certError) {
                console.error('❌ Error checking certifications for completion:', certError);
                // Don't fail the lesson completion if certification check fails
            }
        }

        // Update progress for all certifications the user is enrolled in
        try {
            // Get all in_progress certifications for this user that include courses from this lesson
            const [userCertEnrollments] = await promisePool.query(
                `SELECT DISTINCT sce.id as enrollment_id, sce.user_id, sce.certification_id
                 FROM student_certification_enrollments sce
                 INNER JOIN certification_course_requirements ccr ON sce.certification_id = ccr.certification_id
                 WHERE sce.user_id = ?
                   AND ccr.course_id = ?
                   AND sce.status = 'in_progress'`,
                [userId, courseId]
            );

            console.log(`[LessonComplete] Found ${userCertEnrollments.length} certification(s) to update progress for`);

            for (const enrollment of userCertEnrollments) {
                const progressResult = await certificationService.updateCertificationProgress(
                    enrollment.enrollment_id,
                    enrollment.user_id,
                    enrollment.certification_id
                );

                if (progressResult.completed) {
                    console.log(`🎉 Certification ${enrollment.certification_id} completed!`, progressResult);
                } else {
                    console.log(`📊 Certification ${enrollment.certification_id} progress: ${progressResult.progressPercentage}%`);
                }
            }
        } catch (certProgressError) {
            console.error('❌ Error updating certification progress:', certProgressError);
            // Don't fail the lesson completion if certification progress update fails
        }

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

// Get user's rating for a specific course
async getUserCourseRating(userId, courseId) {
  try {
    const [result] = await promisePool.query(
      'SELECT rating, review, date_added, last_modified FROM course_rating WHERE user_id = ? AND course_id = ?',
      [userId, courseId]
    );

    if (result.length === 0) {
      return new ServiceResponseDTO(true, null, 'No rating found for this course');
    }

    return new ServiceResponseDTO(true, {
      rating: result[0].rating,
      review: result[0].review,
      dateAdded: result[0].date_added,
      lastModified: result[0].last_modified
    });
  } catch (error) {
    return new ErrorResponseDTO(error);
  }
}

// Submit a new course rating
async submitCourseRating(userId, courseId, rating, review = '') {
  try {
    // Check if user is enrolled in the course
    const enrollmentCheck = await this.checkEnrollment(userId, courseId);
    if (!enrollmentCheck.success || !enrollmentCheck.data.is_enrolled) {
      return new ErrorResponseDTO(new Error('You must be enrolled in the course to submit a rating'), 403);
    }

    // Check if user has already rated
    const existingRating = await this.getUserCourseRating(userId, courseId);
    if (existingRating.success && existingRating.data) {
      return new ErrorResponseDTO(new Error('You have already rated this course. Please update your existing rating instead.'), 400);
    }

    // Insert new rating
    const [result] = await promisePool.query(
      'INSERT INTO course_rating (user_id, course_id, rating, review, date_added, last_modified) VALUES (?, ?, ?, ?, NOW(), NOW())',
      [userId, courseId, rating, review]
    );

    // Award points for rating a course
    await achievementsService.awardPoints(
      userId,
      5,
      0,
      'course_rate',
      'rating',
      courseId,
      `Rated course ID: ${courseId}`
    );

    return new ServiceResponseDTO(true, {
      id: result.insertId,
      rating,
      review,
      message: 'Rating submitted successfully'
    });
  } catch (error) {
    return new ErrorResponseDTO(error);
  }
}

// Update an existing course rating
async updateCourseRating(userId, courseId, rating, review = '') {
  try {
    // Check if user has an existing rating
    const existingRating = await this.getUserCourseRating(userId, courseId);
    if (!existingRating.success || !existingRating.data) {
      return new ErrorResponseDTO(new Error('No existing rating found. Please submit a new rating instead.'), 404);
    }

    // Update rating
    const [result] = await promisePool.query(
      'UPDATE course_rating SET rating = ?, review = ?, last_modified = NOW() WHERE user_id = ? AND course_id = ?',
      [rating, review, userId, courseId]
    );

    if (result.affectedRows === 0) {
      return new ErrorResponseDTO(new Error('Failed to update rating'), 500);
    }

    return new ServiceResponseDTO(true, {
      rating,
      review,
      message: 'Rating updated successfully'
    });
  } catch (error) {
    return new ErrorResponseDTO(error);
  }
}

  // ============================================================================
  // ASSESSMENT / QUIZ METHODS
  // ============================================================================

  /**
   * Get assessment form + questions for a lesson's linked assessment.
   * Does NOT return correct_answers to prevent cheating.
   */
  async getLessonAssessment(userId, courseId, lessonId) {
    try {
      // Verify enrollment
      const [enrollment] = await promisePool.query(
        'SELECT id FROM enrol WHERE user_id = ? AND course_id = ?',
        [userId, courseId]
      );
      if (enrollment.length === 0) {
        return new ErrorResponseDTO(new Error('You must be enrolled in this course'), 403);
      }

      // Get lesson and its assessment_id
      const [lessons] = await promisePool.query(
        'SELECT id, assessment_id, lesson_content_type FROM course_lesson WHERE id = ? AND course_id = ?',
        [lessonId, courseId]
      );
      if (lessons.length === 0) {
        return new ErrorResponseDTO(new Error('Lesson not found'), 404);
      }
      const lesson = lessons[0];
      if (lesson.lesson_content_type !== 'quiz' || !lesson.assessment_id) {
        return new ErrorResponseDTO(new Error('This lesson does not have an assessment'), 400);
      }

      // Get the assessment form
      const [forms] = await promisePool.query(
        'SELECT id, name, description, type, assessment_type, show_correct_answers FROM feedback_forms WHERE id = ? AND is_deleted = 0',
        [lesson.assessment_id]
      );
      if (forms.length === 0) {
        return new ErrorResponseDTO(new Error('Assessment not found'), 404);
      }
      const form = forms[0];

      // Get questions WITHOUT correct_answers
      const [questions] = await promisePool.query(
        `SELECT id, question_order, question_type, question_text, is_required, options, score
         FROM feedback_questions WHERE form_id = ? ORDER BY question_order ASC`,
        [form.id]
      );

      // Check for previous attempt by this user
      const [prevAttempts] = await promisePool.query(
        `SELECT id, score, max_score, percentage, submitted_at
         FROM feedback_responses
         WHERE form_id = ? AND respondent_name = ?
         ORDER BY submitted_at DESC LIMIT 1`,
        [form.id, userId]
      );

      return new ServiceResponseDTO(true, {
        form: {
          id: form.id,
          name: form.name,
          description: form.description,
          type: form.type,
          assessmentType: form.assessment_type || 'objective',
          showCorrectAnswers: form.show_correct_answers === 1,
          questions: questions.map(q => ({
            ...q,
            options: q.options ? (typeof q.options === 'string' ? JSON.parse(q.options) : q.options) : null,
            is_required: q.is_required === 1,
          })),
        },
        previousAttempt: prevAttempts.length > 0 ? prevAttempts[0] : null,
      });
    } catch (error) {
      console.error('Error in getLessonAssessment:', error);
      return new ErrorResponseDTO(error);
    }
  }

  /**
   * Submit quiz answers for a lesson's assessment.
   * Auto-scores, stores response, and marks lesson complete on pass.
   */
  async submitLessonAssessment(userId, courseId, lessonId, answers) {
    const connection = await promisePool.getConnection();
    try {
      await connection.beginTransaction();

      // Verify enrollment
      const [enrollment] = await connection.query(
        'SELECT id FROM enrol WHERE user_id = ? AND course_id = ?',
        [userId, courseId]
      );
      if (enrollment.length === 0) {
        await connection.rollback();
        connection.release();
        return new ErrorResponseDTO(new Error('You must be enrolled in this course'), 403);
      }

      // Get lesson and assessment_id
      const [lessons] = await connection.query(
        'SELECT id, assessment_id, lesson_content_type FROM course_lesson WHERE id = ? AND course_id = ?',
        [lessonId, courseId]
      );
      if (lessons.length === 0 || lessons[0].lesson_content_type !== 'quiz' || !lessons[0].assessment_id) {
        await connection.rollback();
        connection.release();
        return new ErrorResponseDTO(new Error('Invalid quiz lesson'), 400);
      }
      const assessmentId = lessons[0].assessment_id;

      // Get form details
      const [forms] = await connection.query(
        'SELECT id, type, assessment_type, show_correct_answers FROM feedback_forms WHERE id = ? AND is_deleted = 0',
        [assessmentId]
      );
      if (forms.length === 0) {
        await connection.rollback();
        connection.release();
        return new ErrorResponseDTO(new Error('Assessment not found'), 404);
      }
      const form = forms[0];
      const showCorrectAnswers = form.show_correct_answers === 1;
      const isSubjective = form.assessment_type === 'subjective';

      // Get questions WITH correct_answers for scoring
      const [questions] = await connection.query(
        `SELECT id, question_order, question_type, question_text, options, correct_answers, score
         FROM feedback_questions WHERE form_id = ? ORDER BY question_order ASC`,
        [assessmentId]
      );

      // Parse options for scoring
      const questionsForScoring = questions.map(q => ({
        ...q,
        options: q.options ? (typeof q.options === 'string' ? JSON.parse(q.options) : q.options) : [],
        correct_answers: q.correct_answers ? (typeof q.correct_answers === 'string' ? JSON.parse(q.correct_answers) : q.correct_answers) : [],
      }));

      // Calculate score - different approach for subjective vs objective
      let scoreData;
      let aiScoringResults = null;

      if (isSubjective) {
        // Build question-answer pairs for AI scoring
        const subjectiveTypes = ['short_text', 'paragraph', 'slider'];
        const questionsForAI = [];

        for (const question of questionsForScoring) {
          const userAnswer = answers.find(a => a.questionId === question.id);
          if (subjectiveTypes.includes(question.question_type)) {
            let answerText = '';
            if (question.question_type === 'slider') {
              answerText = userAnswer?.rating !== undefined ? `Rating: ${userAnswer.rating} out of 10` : '(No answer)';
            } else {
              answerText = userAnswer?.text || '(No answer provided)';
            }
            questionsForAI.push({
              questionId: question.id,
              questionText: question.question_text,
              answerText,
              maxScore: question.score || 1,
            });
          }
        }

        // Call Gemini AI for scoring
        try {
          const aiScores = await geminiAIService.scoreSubjectiveAnswers(questionsForAI);
          aiScoringResults = {};
          let totalScore = 0;
          let totalMaxScore = 0;

          for (let i = 0; i < questionsForAI.length; i++) {
            const qId = questionsForAI[i].questionId;
            const aiResult = aiScores[i];
            aiScoringResults[qId] = {
              score: aiResult.score,
              maxScore: aiResult.maxScore,
              feedback: aiResult.feedback,
            };
            totalScore += aiResult.score;
            totalMaxScore += aiResult.maxScore;
          }

          // Also account for any objective questions in a mixed assessment
          for (const question of questionsForScoring) {
            if (!subjectiveTypes.includes(question.question_type)) {
              const userAnswer = answers.find(a => a.questionId === question.id);
              const qMaxScore = question.score || 1;
              totalMaxScore += qMaxScore;
              if (userAnswer && question.correct_answers && question.correct_answers.length > 0) {
                let userSelectedIndices = [];
                if (userAnswer.options) {
                  const selectedOptions = typeof userAnswer.options === 'string'
                    ? JSON.parse(userAnswer.options) : userAnswer.options;
                  if (Array.isArray(selectedOptions)) {
                    userSelectedIndices = selectedOptions.map(opt =>
                      question.options.findIndex(o => o === opt)
                    ).filter(idx => idx !== -1);
                  }
                }
                const correctAnswersSet = new Set(question.correct_answers);
                const userAnswersSet = new Set(userSelectedIndices);
                const isCorrect = question.correct_answers.length === userSelectedIndices.length &&
                  question.correct_answers.every(idx => userAnswersSet.has(idx)) &&
                  userSelectedIndices.every(idx => correctAnswersSet.has(idx));
                if (isCorrect) totalScore += qMaxScore;
              }
            }
          }

          scoreData = {
            score: parseFloat(totalScore.toFixed(2)),
            maxScore: totalMaxScore,
            percentage: totalMaxScore > 0 ? ((totalScore / totalMaxScore) * 100).toFixed(2) : 0,
          };
        } catch (aiError) {
          console.error('AI scoring failed, falling back to zero scores for subjective:', aiError.message);
          // Fallback: give 0 for subjective, normal scoring for objective
          scoreData = calculateAssessmentScore(questionsForScoring, answers);
          // Mark that AI scoring failed
          aiScoringResults = { _error: 'AI scoring unavailable. Your subjective answers will be reviewed manually.' };
        }
      } else {
        // Objective scoring (existing logic)
        scoreData = calculateAssessmentScore(questionsForScoring, answers);
      }

      // Check if score and max_score columns exist in feedback_responses
      const [scoreCols] = await connection.query(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = 'lms_db' AND TABLE_NAME = 'feedback_responses'
        AND COLUMN_NAME IN ('score', 'max_score', 'percentage')
      `);
      const hasScoreCols = scoreCols.length >= 3;

      // Insert response - use respondent_name to store userId for student identification
      let insertQuery, insertParams;
      if (hasScoreCols) {
        insertQuery = `INSERT INTO feedback_responses (form_id, respondent_name, score, max_score, percentage, submitted_at)
                       VALUES (?, ?, ?, ?, ?, NOW())`;
        insertParams = [assessmentId, userId, scoreData.score, scoreData.maxScore, scoreData.percentage];
      } else {
        insertQuery = `INSERT INTO feedback_responses (form_id, respondent_name, submitted_at)
                       VALUES (?, ?, NOW())`;
        insertParams = [assessmentId, userId];
      }
      const [responseResult] = await connection.query(insertQuery, insertParams);
      const responseId = responseResult.insertId;

      // Insert individual answers
      for (const answer of answers) {
        await connection.query(
          `INSERT INTO feedback_answers (response_id, question_id, answer_text, answer_options, answer_rating)
           VALUES (?, ?, ?, ?, ?)`,
          [
            responseId,
            answer.questionId,
            answer.text || null,
            answer.options ? JSON.stringify(answer.options) : null,
            answer.rating !== undefined ? answer.rating : null,
          ]
        );
      }

      // Auto-mark lesson complete (quiz completion = lesson completion)
      let lessonCompleted = false;
      try {
        await connection.query('CALL mark_lesson_completed(?, ?, ?)', [userId, lessonId, courseId]);
        lessonCompleted = true;
      } catch (markError) {
        console.error('Error auto-marking lesson complete:', markError);
      }

      await connection.commit();

      // Build per-question results
      let detailedResults = null;
      if (isSubjective) {
        // For subjective assessments, always show results with AI feedback
        detailedResults = questionsForScoring.map(question => {
          const userAnswer = answers.find(a => a.questionId === question.id);
          const aiResult = aiScoringResults && !aiScoringResults._error
            ? aiScoringResults[question.id]
            : null;

          let userAnswerText = '';
          if (question.question_type === 'slider') {
            userAnswerText = userAnswer?.rating !== undefined ? `${userAnswer.rating}/10` : 'No answer';
          } else if (userAnswer?.text) {
            userAnswerText = userAnswer.text;
          } else {
            userAnswerText = 'No answer provided';
          }

          return {
            questionId: question.id,
            questionText: question.question_text,
            questionType: question.question_type,
            userAnswerText,
            aiScore: aiResult ? aiResult.score : null,
            aiMaxScore: aiResult ? aiResult.maxScore : (question.score || 1),
            aiFeedback: aiResult ? aiResult.feedback : (aiScoringResults?._error || null),
            isSubjective: true,
          };
        });
      } else if (showCorrectAnswers) {
        // Objective results (existing logic)
        detailedResults = questionsForScoring.map(question => {
          const userAnswer = answers.find(a => a.questionId === question.id);
          let userSelectedIndices = [];
          if (userAnswer && userAnswer.options) {
            const selectedOptions = typeof userAnswer.options === 'string'
              ? JSON.parse(userAnswer.options) : userAnswer.options;
            if (Array.isArray(selectedOptions)) {
              userSelectedIndices = selectedOptions.map(opt =>
                question.options.findIndex(o => o === opt)
              ).filter(idx => idx !== -1);
            }
          }

          const correctAnswersSet = new Set(question.correct_answers);
          const userAnswersSet = new Set(userSelectedIndices);
          const isCorrect = question.correct_answers.length === userSelectedIndices.length &&
            question.correct_answers.every(idx => userAnswersSet.has(idx)) &&
            userSelectedIndices.every(idx => correctAnswersSet.has(idx));

          return {
            questionId: question.id,
            questionText: question.question_text,
            questionType: question.question_type,
            options: question.options,
            userSelectedIndices,
            correctIndices: question.correct_answers,
            isCorrect,
            isSubjective: false,
          };
        });
      }

      // Award points for quiz completion
      try {
        await achievementsService.awardPoints(
          userId, 15, 0, 'quiz_complete', 'lesson', lessonId,
          `Completed quiz for lesson ID: ${lessonId} - Score: ${scoreData.score}/${scoreData.maxScore}`
        );
      } catch (pointsErr) {
        console.error('Error awarding quiz points:', pointsErr);
      }

      return new ServiceResponseDTO(true, {
        score: scoreData.score,
        maxScore: scoreData.maxScore,
        percentage: parseFloat(scoreData.percentage),
        showCorrectAnswers: isSubjective ? true : showCorrectAnswers,
        assessmentType: form.assessment_type || 'objective',
        results: detailedResults,
        lessonCompleted,
        responseId,
      });
    } catch (error) {
      await connection.rollback();
      console.error('Error in submitLessonAssessment:', error);
      return new ErrorResponseDTO(error);
    } finally {
      connection.release();
    }
  }

}

module.exports = new CourseService();