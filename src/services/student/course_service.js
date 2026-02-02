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
          (SELECT COUNT(*) FROM lesson_progress WHERE course_id = c.id AND user_id = ? AND completed = 1) as completedLessons
        FROM enrol e
        INNER JOIN course c ON e.course_id = c.id
        LEFT JOIN category cat ON c.category_id = cat.id
        WHERE e.user_id = ? AND c.is_deleted = 0 AND c.status = 'active'
        ORDER BY e.enrolled_date DESC
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

async getLessonById(courseId, lessonId) {
  console.log("getLessonById called with courseId:", courseId, "lessonId:", lessonId);

  try {
    const [lessons] = await promisePool.query(
      `SELECT l.*, s.title as section_title
      FROM course_lesson l
      LEFT JOIN course_section s ON l.section_id = s.id
      WHERE l.id = ? AND l.course_id = ?`,
      [lessonId, courseId]
    );

    if (lessons.length === 0) {
      throw new Error("Lesson not found");
    }

    const lesson = lessons[0];

    return {
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
    };
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

}

module.exports = new CourseService();