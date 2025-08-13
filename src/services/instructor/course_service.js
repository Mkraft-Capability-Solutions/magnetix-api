const { promisePool } = require("../../config/db");
const {
  CourseDTO,
  CourseOutcomeDTO,
  CourseRequirementDTO,
  CourseFAQDTO,
  CourseSectionDTO,
  CourseLessonDTO,
  ILTSDTO,
  EnrolledStudentDTO,
  SkillDTO,
  DTOTransformer,
} = require("../../dto/instructor/course_dto");

class InstructorCourseService {
  async addCourse(userId, courseData) {
    console.log(
      "addCourse called with data:",
      JSON.stringify(courseData, null, 2)
    );

    const {
      title,
      shortDescription,
      description,
      languageId,
      categoryId,
      subCategoryId,
      level,
      courseDuration,
      thumbnail,
      mediaType,
      mediaUrl,
      metaKeywords,
      metaDescription,
      outcomes,
      requirements,
      faqs,
      lessons,
    } = courseData;

    const connection = await promisePool.getConnection();
    await connection.beginTransaction();

    try {
      // Add main course
      const [result] = await connection.query(
        "CALL add_instructor_course(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          userId,
          title,
          shortDescription,
          description,
          languageId,
          categoryId,
          subCategoryId,
          level,
          courseDuration,
          thumbnail,
          mediaType,
          mediaUrl,
          metaKeywords,
          metaDescription,
        ]
      );

      const courseId = result[0][0].id;
      console.log("Course created with ID:", courseId);

      if (!courseId) {
        throw new Error("Failed to create course");
      }

      // Add outcomes
      if (outcomes && outcomes.length > 0) {
        for (const outcome of outcomes) {
          if (outcome.trim()) {
            await connection.query("CALL add_course_outcome(?, ?, ?, ?)", [
              outcome,
              courseId,
              userId,
              userId,
            ]);
          }
        }
      }

      // Add requirements
      if (requirements && requirements.length > 0) {
        for (const requirement of requirements) {
          if (requirement.trim()) {
            await connection.query("CALL add_course_requirement(?, ?, ?, ?)", [
              requirement,
              courseId,
              userId,
              userId,
            ]);
          }
        }
      }

      // Add FAQs
      if (faqs && faqs.length > 0) {
        for (const faq of faqs) {
          if (faq.question && faq.answer) {
            await connection.query("CALL add_course_faq(?, ?, ?, ?, ?)", [
              faq.question,
              faq.answer,
              courseId,
              userId,
              userId,
            ]);
          }
        }
      }

      // Group lessons by section and process them
      if (lessons && lessons.length > 0) {
        const sectionsMap = new Map();

        // Group lessons by section
        for (const lesson of lessons) {
          const sectionTitle = lesson.section || "Default Section";
          if (!sectionsMap.has(sectionTitle)) {
            sectionsMap.set(sectionTitle, []);
          }
          sectionsMap.get(sectionTitle).push(lesson);
        }

        // Process each section
        for (const [sectionTitle, sectionLessons] of sectionsMap) {
          console.log(
            `Processing section: ${sectionTitle} with ${sectionLessons.length} lessons`
          );

          // Create section
          const [sectionResult] = await connection.query(
            "CALL add_course_section(?, ?, ?, ?)",
            [sectionTitle, courseId, userId, userId]
          );

          const sectionId = sectionResult[0][0].id;
          console.log(`Section created with ID: ${sectionId}`);

          // Process lessons in this section
          for (const lesson of sectionLessons) {
            console.log(`Processing lesson: ${lesson.title}`);

            const [lessonResult] = await connection.query(
              "CALL add_course_lesson(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
              [
                lesson.title,
                sectionId,
                lesson.lessonType || "Content-Based",
                lesson.contentType || null,
                lesson.lessonContentDocument || null,
                lesson.scromPackage || null,
                lesson.videoUpload || null,
                lesson.contentUrl || null,
                lesson.lessonDuration || null,
                courseId,
                userId,
                userId,
              ]
            );

            const lessonId = lessonResult[0][0].id;
            console.log(`Lesson created with ID: ${lessonId}`);

            // Handle ILTS if lesson type is ILTS
            if (lesson.lessonType === "ILTS") {
              console.log("Adding ILTS session for lesson:", lessonId);
              await connection.query(
                "CALL add_ilts_session(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                [
                  courseId,
                  lessonId,
                  lesson.iltsType || lesson.iltsMode,
                  lesson.iltsUrl || lesson.meetUrl,
                  lesson.eventVenue || lesson.venue,
                  lesson.startDate,
                  lesson.startTime,
                  lesson.endDate,
                  lesson.endTime,
                  userId,
                ]
              );
            }

            // Handle skills
            if (lesson.skills && lesson.skills.length > 0) {
              for (const skillName of lesson.skills) {
                if (skillName.trim()) {
                  const [skillResult] = await connection.query(
                    "CALL add_or_get_skill(?, ?)",
                    [skillName.trim(), userId]
                  );

                  const skillId = skillResult[0][0].id;
                  await connection.query("CALL add_lesson_skill(?, ?)", [
                    lessonId,
                    skillId,
                  ]);
                }
              }
            }
          }
        }
      }

      await connection.commit();

      // Fetch the complete course data to return
      const courseDetails = await this.getCourseDetailsById(courseId, userId);

      return {
        success: true,
        courseId,
        data: {
          courseId,
          sections: courseDetails.sections || [],
          lessons: courseDetails.lessons || [],
        },
      };
    } catch (error) {
      await connection.rollback();
      console.error("Error in addCourse:", error);
      throw error;
    } finally {
      connection.release();
    }
  }

  async updateCourse(userId, courseId, courseData) {
    console.log(
      "updateCourse called with ID:",
      courseId,
      "data:",
      JSON.stringify(courseData, null, 2)
    );

    const {
      title,
      shortDescription,
      description,
      language,
      category,
      subcategory,
      level,
      courseDuration,
      thumbnail,
      mediaType,
      mediaUrl,
      metaKeywords,
      metaDescription,
      outcomes,
      requirements,
      faqs,
      lessons,
    } = courseData;

    const connection = await promisePool.getConnection();
    await connection.beginTransaction();

    try {
      // Update main course
      const [result] = await connection.query(
        "CALL update_instructor_course(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          courseId,
          userId,
          title,
          shortDescription,
          description,
          language,
          category,
          subcategory,
          level,
          courseDuration,
          thumbnail,
          mediaType,
          mediaUrl,
          metaKeywords,
          metaDescription,
        ]
      );

      if (result[0][0].affected_rows === 0) {
        throw new Error("Course not found or not authorized to update");
      }

      // Update outcomes
      await connection.query("CALL delete_course_outcomes(?)", [courseId]);
      if (outcomes && outcomes.length > 0) {
        for (const outcome of outcomes) {
          if (outcome.trim()) {
            await connection.query("CALL add_course_outcome(?, ?, ?, ?)", [
              outcome,
              courseId,
              userId,
              userId,
            ]);
          }
        }
      }

      // Update requirements
      await connection.query("CALL delete_course_requirements(?)", [courseId]);
      if (requirements && requirements.length > 0) {
        for (const requirement of requirements) {
          if (requirement.trim()) {
            await connection.query("CALL add_course_requirement(?, ?, ?, ?)", [
              requirement,
              courseId,
              userId,
              userId,
            ]);
          }
        }
      }

      // Update FAQs
      await connection.query("CALL delete_course_faqs(?)", [courseId]);
      if (faqs && faqs.length > 0) {
        for (const faq of faqs) {
          if (faq.question && faq.answer) {
            await connection.query("CALL add_course_faq(?, ?, ?, ?, ?)", [
              faq.question,
              faq.answer,
              courseId,
              userId,
              userId,
            ]);
          }
        }
      }

      // Update lessons - Delete existing and recreate
      if (lessons && lessons.length > 0) {
        // Delete existing lessons and sections
        await connection.query(
          "DELETE FROM lesson_skills WHERE lesson_id IN (SELECT id FROM course_lesson WHERE course_id = ?)",
          [courseId]
        );
        await connection.query("DELETE FROM ilts WHERE course_id = ?", [
          courseId,
        ]);
        await connection.query(
          "DELETE FROM course_lesson WHERE course_id = ?",
          [courseId]
        );
        await connection.query(
          "DELETE FROM course_section WHERE course_id = ?",
          [courseId]
        );

        // Recreate lessons and sections
        const sectionsMap = new Map();

        // Group lessons by section
        for (const lesson of lessons) {
          const sectionTitle = lesson.section || "Default Section";
          if (!sectionsMap.has(sectionTitle)) {
            sectionsMap.set(sectionTitle, []);
          }
          sectionsMap.get(sectionTitle).push(lesson);
        }

        // Process each section
        for (const [sectionTitle, sectionLessons] of sectionsMap) {
          // Create section
          const [sectionResult] = await connection.query(
            "CALL add_course_section(?, ?, ?, ?)",
            [sectionTitle, courseId, userId, userId]
          );

          const sectionId = sectionResult[0][0].id;

          // Process lessons in this section
          for (const lesson of sectionLessons) {
            const [lessonResult] = await connection.query(
              "CALL add_course_lesson(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
              [
                lesson.title,
                sectionId,
                lesson.lessonType || "Content-Based",
                lesson.contentType || null,
                lesson.lessonContentDocument || null,
                lesson.scromPackage || null,
                lesson.videoUpload || null,
                lesson.contentUrl || null,
                lesson.lessonDuration || null,
                courseId,
                userId,
                userId,
              ]
            );

            const lessonId = lessonResult[0][0].id;

            // Handle ILTS if lesson type is ILTS
            if (lesson.lessonType === "ILTS") {
              await connection.query(
                "CALL add_ilts_session(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                [
                  courseId,
                  lessonId,
                  lesson.iltsType || lesson.iltsMode,
                  lesson.iltsUrl || lesson.meetUrl,
                  lesson.eventVenue || lesson.venue,
                  lesson.startDate,
                  lesson.startTime,
                  lesson.endDate,
                  lesson.endTime,
                  userId,
                ]
              );
            }

            // Handle skills
            if (lesson.skills && lesson.skills.length > 0) {
              for (const skillName of lesson.skills) {
                if (skillName.trim()) {
                  const [skillResult] = await connection.query(
                    "CALL add_or_get_skill(?, ?)",
                    [skillName.trim(), userId]
                  );

                  const skillId = skillResult[0][0].id;
                  await connection.query("CALL add_lesson_skill(?, ?)", [
                    lessonId,
                    skillId,
                  ]);
                }
              }
            }
          }
        }
      }

      await connection.commit();

      // Fetch the updated course data to return
      const courseDetails = await this.getCourseDetailsById(courseId, userId);

      return {
        success: true,
        data: {
          courseId,
          sections: courseDetails.sections || [],
          lessons: courseDetails.lessons || [],
        },
      };
    } catch (error) {
      await connection.rollback();
      console.error("Error in updateCourse:", error);
      throw error;
    } finally {
      connection.release();
    }
  }

  async deleteCourse(userId, courseId) {
    const connection = await promisePool.getConnection();
    try {
      const [result] = await connection.query(
        "CALL delete_instructor_course(?, ?)",
        [courseId, userId]
      );

      if (result.affectedRows === 0) {
        throw new Error("Course not found or not authorized to delete");
      }

      return { success: true };
    } finally {
      connection.release();
    }
  }

  // Get active courses directly from table
  async getInstructorActiveCourses(userId) {
    const [rows] = await promisePool.query(
      `SELECT * FROM course 
            WHERE creator_id = ? AND status = 'active' AND is_deleted = 0`,
      [userId]
    );
    return rows.map(CourseDTO.courseToDTO);
  }

  // Get pending courses directly from table
  async getInstructorPendingCourses(userId) {
    const [rows] = await promisePool.query(
      `SELECT * FROM course 
            WHERE creator_id = ? AND status = 'pending' AND is_deleted = 0
            ORDER BY last_updated DESC`,
      [userId]
    );
    return rows.map(CourseDTO.courseToDTO);
  }

  async getCategories() {
    const [rows] = await promisePool.query("CALL get_all_categories()");
    return rows[0];
  }

  async getSubCategories() {
    const [rows] = await promisePool.query("CALL get_all_subcategories()");
    return rows[0];
  }

  async getLanguages() {
    const [rows] = await promisePool.query("CALL get_all_languages()");
    return rows[0];
  }

  async getEnrolledStudents(courseId, userId) {
    const [rows] = await promisePool.query(
      "CALL get_enrolled_students_with_progress(?, ?)",
      [courseId, userId]
    );
    return rows[0].map((data) => new EnrolledStudentDTO(data));
  }

  async getCourseDetailsById(courseId, userId) {
    const [results] = await promisePool.query(
      "CALL get_course_details_by_id(?, ?)",
      [courseId, userId]
    );

    if (!results[0][0]) {
      throw new Error("Course not found or not authorized");
    }

    // Transform the results into a structured object
    const courseDetails = {
      course: new CourseDTO(results[0][0]),
      outcomes: results[1]
        ? results[1].map((outcome) => new CourseOutcomeDTO(outcome))
        : [],
      requirements: results[2]
        ? results[2].map((req) => new CourseRequirementDTO(req))
        : [],
      faqs: results[3] ? results[3].map((faq) => new CourseFAQDTO(faq)) : [],
      sections: results[4]
        ? results[4].map((section) => new CourseSectionDTO(section))
        : [],
      lessons: [], // This will be populated from the lessons data
      lessonSkills: [], // This will be populated from the skills data
    };

    // Process lessons and ILTS details
    const lessonsMap = {};
    if (results[5]) {
      results[5].forEach((lessonData) => {
        const lesson = new CourseLessonDTO(lessonData);
        if (lessonData.ilts_id) {
          lesson.iltsDetails = new ILTSDTO({
            id: lessonData.ilts_id,
            lesson_mode: lessonData.lesson_mode,
            meet_url: lessonData.meet_url,
            venue: lessonData.venue,
            start_date: lessonData.start_date,
            start_time: lessonData.start_time,
            end_date: lessonData.end_date,
            end_time: lessonData.end_time,
          });
        }
        lessonsMap[lesson.id] = lesson;
        courseDetails.lessons.push(lesson);
      });
    }

    // Process skills
    if (results[6]) {
      const lessonSkillsMap = {};
      results[6].forEach((skillData) => {
        if (!lessonsMap[skillData.lesson_id]) return;

        if (!lessonsMap[skillData.lesson_id].skills) {
          lessonsMap[skillData.lesson_id].skills = [];
        }
        lessonsMap[skillData.lesson_id].skills.push(skillData.skill_name);

        // Group skills by lesson for frontend compatibility
        if (!lessonSkillsMap[skillData.lesson_id]) {
          lessonSkillsMap[skillData.lesson_id] = {
            lessonId: skillData.lesson_id,
            skills: [],
          };
        }
        lessonSkillsMap[skillData.lesson_id].skills.push(skillData.skill_name);
      });

      courseDetails.lessonSkills = Object.values(lessonSkillsMap);
    }

    // Group lessons by section
    courseDetails.sections.forEach((section) => {
      section.lessons = Object.values(lessonsMap)
        .filter((lesson) => lesson.sectionId === section.id)
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    });

    // Add ILTS data to course details
    if (results[5]) {
      courseDetails.ilts = results[5]
        .filter((lesson) => lesson.ilts_id)
        .map((lesson) => ({
          lesson_id: lesson.id,
          lesson_mode: lesson.lesson_mode,
          meet_url: lesson.meet_url,
          venue: lesson.venue,
          start_date: lesson.start_date,
          start_time: lesson.start_time,
          end_date: lesson.end_date,
          end_time: lesson.end_time,
        }));
    } else {
      courseDetails.ilts = [];
    }

    return courseDetails;
  }

  async getEnrolledStudentsWithProgress(courseId) {
    const [rows] = await promisePool.query(
      "CALL get_enrolled_students_with_progress(?)",
      [courseId]
    );

    return rows[0].map((data) => ({
      userId: data.user_id,
      firstName: data.first_name,
      lastName: data.last_name,
      email: data.email,
      profileImage: data.profile_image,
      progressPercentage: data.progress_percentage || 0,
      completedLessons: data.completed_lessons || 0,
      totalLessonsAvailable: data.total_lessons_available || 0,
      lastAccessed: data.last_accessed,
      lastAccessedLessonId: data.last_accessed_lesson_id,
      lastAccessedLessonTitle: data.last_accessed_lesson_title,
    }));
  }

  // const result = await instructorCourseService.addCourseRequirements(
  //   courseId,
  //   requirements
  // );
  // const result = await instructorCourseService.addCourseOutcomes(
  //   courseId,
  //   outcomes
  // );

  // const result = await instructorCourseService.addCourseFAQs(courseId, faqs);
  async addCourseRequirements(courseId, requirements) {
    console.log("addCourseRequirements called with courseId:", courseId);
    console.log("Requirements data:", JSON.stringify(requirements, null, 2));

    const connection = await promisePool.getConnection();
    try {
      await connection.beginTransaction();

      for (const requirement of requirements) {
        //insert into requirements table(requirement,course_id,creator_id), don't use stored procedure
        if (requirement.trim()) {
          const [result] = await connection.query(
            "INSERT INTO course_requirements (requirement, course_id, creator_id, last_updated_by) VALUES (?, ?, ?, ?)",
            [
              requirement,
              courseId,
              requirements.creatorId,
              requirements.creatorId,
            ]
          );

          if (result.affectedRows === 0) {
            throw new Error("Failed to add requirement");
          }
        }
      }

      await connection.commit();
      return { success: true };
    } catch (error) {
      await connection.rollback();
      console.error("Error in addCourseRequirements:", error);
      throw error;
    } finally {
      connection.release();
    }
  }
  async addCourseOutcomes(courseId, outcomes) {
    console.log("addCourseOutcomes called with courseId:", courseId);
    console.log("Outcomes data:", JSON.stringify(outcomes, null, 2));

    const connection = await promisePool.getConnection();
    try {
      await connection.beginTransaction();

      for (const outcome of outcomes) {
        if (outcome.trim()) {
          const [result] = await connection.query(
            "INSERT INTO course_outcomes (outcome, course_id, creator_id, last_updated_by) VALUES (?, ?, ?, ?)",
            [outcome, courseId, outcomes.creatorId, outcomes.creatorId]
          );

          if (result.affectedRows === 0) {
            throw new Error("Failed to add outcome");
          }
        }
      }

      await connection.commit();
      return { success: true };
    } catch (error) {
      await connection.rollback();
      console.error("Error in addCourseOutcomes:", error);
      throw error;
    } finally {
      connection.release();
    }
  }
  async addCourseFAQs(courseId, faqs) {
    console.log("addCourseFAQs called with courseId:", courseId);
    console.log("FAQs data:", JSON.stringify(faqs, null, 2));

    const connection = await promisePool.getConnection();
    try {
      await connection.beginTransaction();

      for (const faq of faqs) {
        if (faq.question && faq.answer) {
          const [result] = await connection.query(
            "INSERT INTO course_faq (question, answer, course_id, creator_id, last_updated_by) VALUES (?, ?, ?, ?, ?)",
            [faq.question, faq.answer, courseId, faqs.creatorId, faqs.creatorId]
          );

          if (result.affectedRows === 0) {
            throw new Error("Failed to add FAQ");
          }
        }
      }

      await connection.commit();
      return { success: true };
    } catch (error) {
      await connection.rollback();
      console.error("Error in addCourseFAQs:", error);
      throw error;
    } finally {
      connection.release();
    }
  }

  //   const result = await instructorCourseService.updateMetaKeywords(
  //   courseId,
  //   metaKeywords
  // );
  async updateMetaKeywords(courseId, metaKeywords, metaDescription, creatorId) {
    console.log("updateMetaKeywords called with courseId:", courseId);
    console.log("Meta keywords data:", JSON.stringify(metaKeywords, null, 2));

    const connection = await promisePool.getConnection();
    try {
      await connection.beginTransaction();
      const [result] = await connection.query(
        "UPDATE course SET meta_keywords = ?,meta_description=?, last_updated_by = ? WHERE id = ?",
        [metaKeywords, metaDescription, creatorId, courseId]
      );

      if (result.affectedRows === 0) {
        throw new Error("Failed to update meta keywords or course not found");
      }

      await connection.commit();
      return { success: true };
    } catch (error) {
      await connection.rollback();
      console.error("Error in updateMetaKeywords:", error);
      throw error;
    } finally {
      connection.release();
    }
  }

  async addSection(courseId, section, creatorId) {
    const connection = await promisePool.getConnection();
    try {
      await connection.beginTransaction();

      const [result] = await connection.query(
        "INSERT INTO course_section (title, course_id, creator_id, last_updated_by) VALUES (?, ?, ?, ?)",
        [section, courseId, creatorId, creatorId]
      );

      if (result.affectedRows === 0) {
        throw new Error("Failed to add section");
      }

      await connection.commit();
      return { success: true };
    } catch (error) {
      await connection.rollback();
      console.error("Error in addSection:", error);
      throw error;
    } finally {
      connection.release();
    }
  }
  // Add a lesson to a course
  async addLesson(courseId, lessonData, creatorId) {
    console.log("addLesson called with courseId:", courseId);
    console.log(lessonData);

    const connection = await promisePool.getConnection();
    //lets add through sql not stored procedure
    try {
      await connection.beginTransaction();
      if (lessonData.contentType === "scorm") {
        lessonData.scromPackage = lessonData.file;
      } else if (lessonData.contentType === "document") {
        lessonData.lessonContentDocument = lessonData.file;
      } else if (lessonData.contentType === "video") {
        lessonData.videoUpload = lessonData.file;
      }
      const result = await connection.query(
        "INSERT INTO course_lesson (title, section_id, lesson_type, lesson_content_type, lesson_content_document, lesson_content_scorm, lesson_content_mp4, lesson_content_url, lesson_duration, course_id, creator_id, last_updated_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          lessonData.title,
          lessonData.sectionId,
          lessonData.lessonType || "Content-Based",
          lessonData.contentType || null,
          lessonData.lessonContentDocument || null,
          lessonData.scromPackage || null,
          lessonData.videoUpload || null,
          lessonData.contentUrl || null,
          lessonData.lessonDuration || null,
          courseId,
          creatorId,
          creatorId,
        ]
      );
      await connection.commit();
      console.log(result);
      return result.insertId;
    } catch (error) {
      await connection.rollback();
      console.error("Error in addLesson:", error);
      throw error;
    }
  }

  // async addLesson(courseId, lessonData, creatorId) {
  async getSectionsByCourseId(courseId) {
    console.log("getSectionsByCourseId called with courseId:", courseId);

    const [rows] = await promisePool.query(
      "SELECT * FROM course_section WHERE course_id = ?",
      [courseId]
    );

    if (rows.length === 0) {
      throw new Error("No sections found for this course");
    }

    return rows.map((row) => new CourseSectionDTO(row));
  }
}

module.exports = new InstructorCourseService();
