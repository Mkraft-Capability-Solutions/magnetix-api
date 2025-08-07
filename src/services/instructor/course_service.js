const { promisePool } = require('../../config/db');
const CourseDTO = require('../../dto/instructor/course_dto');

class InstructorCourseService {
  async addCourse(courseData, creatorId) {
    const connection = await promisePool.getConnection();
    try {
      await connection.beginTransaction();

      // 1. Add main course details
      const [courseResult] = await connection.query(
        'CALL instructor_add_course(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          courseData.title,
          courseData.short_description,
          courseData.description,
          courseData.language_id,
          courseData.category_id,
          courseData.sub_category_id,
          courseData.level,
          courseData.course_duration || null,
          courseData.thumbnail || null,
          courseData.course_overview_provider || null,
          courseData.course_overview_video_url || null,
          courseData.course_type || null,
          courseData.meta_keywords || null,
          courseData.meta_description || null,
          creatorId,
          creatorId
        ]
      );

      const courseId = courseResult[0][0].course_id;

      // 2. Add sections and lessons
      for (const section of courseData.sections) {
        const [sectionResult] = await connection.query(
          'CALL instructor_add_course_section(?, ?, ?, ?)',
          [section.title, courseId, creatorId, creatorId]
        );
        
        const sectionId = sectionResult[0][0].section_id;

        for (const lesson of section.lessons) {
          const [lessonResult] = await connection.query(
            'CALL instructor_add_course_lesson(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
              lesson.title,
              sectionId,
              lesson.lesson_type,
              lesson.lesson_content_type || null,
              lesson.lesson_content_document || null,
              lesson.lesson_content_scorm || null,
              lesson.lesson_content_mp4 || null,
              lesson.lesson_content_url || null,
              lesson.lesson_duration || null,
              courseId,
              creatorId
            ]
          );

          const lessonId = lessonResult[0][0].lesson_id;

          // Add ILTS details if lesson type is ILTS
          if (lesson.lesson_type === 'ILTS') {
            await connection.query(
              'CALL instructor_add_ilts(?, ?, ?, ?, ?, ?, ?, ?, ?)',
              [
                courseId,
                lessonId,
                lesson.lesson_mode,
                lesson.meet_url,
                lesson.venue || null,
                lesson.start_date,
                lesson.start_time,
                lesson.end_date,
                lesson.end_time
              ]
            );
          }

          // Add lesson skills if they exist
          if (lesson.skills && lesson.skills.length > 0) {
            for (const skillId of lesson.skills) {
              await connection.query(
                'CALL instructor_add_lesson_skill(?, ?)',
                [lessonId, skillId]
              );
            }
          }
        }
      }

      // 3. Add FAQs if they exist
      if (courseData.faqs && courseData.faqs.length > 0) {
        for (const faq of courseData.faqs) {
          await connection.query(
            'CALL instructor_add_course_faq(?, ?, ?, ?, ?)',
            [faq.question, faq.answer, courseId, creatorId, creatorId]
          );
        }
      }

      // 4. Add requirements if they exist
      if (courseData.requirements && courseData.requirements.length > 0) {
        for (const req of courseData.requirements) {
          await connection.query(
            'CALL instructor_add_course_requirement(?, ?, ?, ?)',
            [req.requirement, courseId, creatorId, creatorId]
          );
        }
      }

      // 5. Add outcomes if they exist
      if (courseData.outcomes && courseData.outcomes.length > 0) {
        for (const outcome of courseData.outcomes) {
          await connection.query(
            'CALL instructor_add_course_outcome(?, ?, ?, ?)',
            [outcome.outcome, courseId, creatorId, creatorId]
          );
        }
      }

      await connection.commit();

      // Get full course details to return
      const fullCourse = await this.getCourseById(courseId, creatorId);
      return new CourseDTO(fullCourse);

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async updateCourse(courseId, courseData, updaterId) {
    const connection = await promisePool.getConnection();
    try {
      await connection.beginTransaction();

      // 1. Update main course details
      await connection.query(
        'CALL instructor_update_course(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          courseId,
          courseData.title,
          courseData.short_description,
          courseData.description,
          courseData.language_id,
          courseData.category_id,
          courseData.sub_category_id,
          courseData.level,
          courseData.course_duration,
          courseData.thumbnail,
          courseData.course_overview_provider,
          courseData.course_overview_video_url,
          courseData.meta_keywords,
          courseData.meta_description,
          updaterId
        ]
      );

      // Note: For simplicity, this implementation assumes sections/lessons are not updated
      // In a real app, you'd need to handle updates/deletes of nested objects

      await connection.commit();

      // Get updated course details to return
      const updatedCourse = await this.getCourseById(courseId, updaterId);
      return new CourseDTO(updatedCourse);

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async getCourseById(courseId, userId) {
    try {
      // Get course basic info
      const [courseResult] = await promisePool.query(
        'CALL instructor_get_course_by_id(?, ?)',
        [courseId, userId]
      );
      
      if (courseResult[0].length === 0) {
        throw new Error('Course not found or not owned by instructor');
      }

      const courseData = courseResult[0][0];

      // Get sections
      const [sectionsResult] = await promisePool.query(
        'CALL instructor_get_course_sections(?)',
        [courseId]
      );

      const sections = [];
      for (const section of sectionsResult[0]) {
        // Get lessons for each section
        const [lessonsResult] = await promisePool.query(
          'CALL instructor_get_section_lessons(?)',
          [section.id]
        );

        const lessons = [];
        for (const lesson of lessonsResult[0]) {
          // Get ILTS details if ILTS lesson
          let iltsDetails = null;
          if (lesson.lesson_type === 'ILTS') {
            const [iltsResult] = await promisePool.query(
              'CALL instructor_get_ilts_details(?)',
              [lesson.id]
            );
            iltsDetails = iltsResult[0][0] || null;
          }

          // Get lesson skills
          const [skillsResult] = await promisePool.query(
            'CALL instructor_get_lesson_skills(?)',
            [lesson.id]
          );

          lessons.push({
            ...lesson,
            skills: skillsResult[0].map(skill => skill.skill_id),
            ilts_details: iltsDetails
          });
        }

        sections.push({
          ...section,
          lessons: lessons
        });
      }

      // Get FAQs
      const [faqsResult] = await promisePool.query(
        'CALL instructor_get_course_faqs(?)',
        [courseId]
      );

      // Get requirements
      const [reqsResult] = await promisePool.query(
        'CALL instructor_get_course_requirements(?)',
        [courseId]
      );

      // Get outcomes
      const [outcomesResult] = await promisePool.query(
        'CALL instructor_get_course_outcomes(?)',
        [courseId]
      );

      return {
        ...courseData,
        sections: sections,
        faqs: faqsResult[0],
        requirements: reqsResult[0],
        outcomes: outcomesResult[0]
      };

    } catch (error) {
      throw error;
    }
  }

  async getMyActiveCourses(instructorId) {
    try {
      const [result] = await promisePool.query(
        'CALL instructor_get_active_courses(?)',
        [instructorId]
      );
      return result[0].map(course => new CourseDTO(course));
    } catch (error) {
      throw error;
    }
  }

  async getMyPendingCourses(instructorId) {
    try {
      const [result] = await promisePool.query(
        'CALL instructor_get_pending_courses(?)',
        [instructorId]
      );
      return result[0].map(course => new CourseDTO(course));
    } catch (error) {
      throw error;
    }
  }

  async deleteCourse(courseId, instructorId) {
    try {
      const [result] = await promisePool.query(
        'CALL instructor_delete_course(?, ?)',
        [courseId, instructorId]
      );
      return result.affectedRows > 0;
    } catch (error) {
      throw error;
    }
  }

  async getCategories() {
    try {
      const [result] = await promisePool.query(
        'CALL get_all_categories()'
      );
      return result[0];
    } catch (error) {
      throw error;
    }
  }

  async getSubCategories(categoryId = null) {
    try {
      const [result] = await promisePool.query(
        'CALL get_subcategories(?)',
        [categoryId]
      );
      return result[0];
    } catch (error) {
      throw error;
    }
  }

  async getLanguages() {
    try {
      const [result] = await promisePool.query(
        'CALL get_all_languages()'
      );
      return result[0];
    } catch (error) {
      throw error;
    }
  }

  async getAllEnrolledStudents(courseId) {
    try {
      // Get enrolled students with basic info
      const [studentsResult] = await promisePool.query(
        'CALL instructor_get_course_enrollments(?)',
        [courseId]
      );

      const students = studentsResult[0];

      // Get progress for each student
      for (const student of students) {
        const [progressResult] = await promisePool.query(
          'CALL instructor_get_student_progress(?, ?)',
          [courseId, student.user_id]
        );
        student.progress = progressResult[0];
      }

      return students;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new InstructorCourseService();