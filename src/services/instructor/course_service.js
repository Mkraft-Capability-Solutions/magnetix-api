const { promisePool } = require("../../config/db");
const uploadService = require("../upload_service");
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
            console.log(`Processing lesson contentType: ${lesson.contentType}`);
            console.log(`Processing lesson data:`, lesson);

            // Map frontend contentType to database enum values
            let dbContentType = null;
            let documentFile = null;
            let scormFile = null; 
            let mp4File = null;
            let contentUrl = null;

            if (lesson.contentType) {
              switch (lesson.contentType) {
                case 'video':
                case 'mp4':
                  dbContentType = 'mp4';
                  // If file is a string (filename), use it; if it's a File object, it will be handled after lesson creation
                  mp4File = typeof (lesson.videoUpload || lesson.file) === 'string' ? (lesson.videoUpload || lesson.file) : null;
                  break;
                case 'document':
                  dbContentType = 'document';
                  // If file is a string (filename), use it; if it's a File object, it will be handled after lesson creation
                  documentFile = typeof (lesson.lessonContentDocument || lesson.file) === 'string' ? (lesson.lessonContentDocument || lesson.file) : null;
                  break;
                case 'scorm':
                  dbContentType = 'scorm';
                  // If file is a string (filename), use it; if it's a File object, it will be handled after lesson creation
                  scormFile = typeof (lesson.scromPackage || lesson.file) === 'string' ? (lesson.scromPackage || lesson.file) : null;
                  break;
                case 'url':
                case 'content_url':
                case 'external_url':
                  dbContentType = 'url';
                  contentUrl = lesson.contentUrl || lesson.url;
                  break;
                default:
                  dbContentType = lesson.contentType;
              }
            }

            console.log(`Mapped content type: ${dbContentType}`);
            console.log(`Document file: ${documentFile}`);
            console.log(`SCORM file: ${scormFile}`);
            console.log(`MP4 file: ${mp4File}`);
            console.log(`Content URL: ${contentUrl}`);

            const [lessonResult] = await connection.query(
              "CALL add_course_lesson(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
              [
                lesson.title,
                sectionId,
                lesson.lessonType || "Content-Based",
                dbContentType,
                documentFile,
                scormFile,
                mp4File,
                contentUrl,
                lesson.lessonDuration || lesson.duration || null,
                courseId,
                userId,
                userId,
              ]
            );

            const lessonId = lessonResult[0][0].id;
            console.log(`Lesson created with ID: ${lessonId}`);

            // Handle file uploads if file objects are provided
            if (lesson.file && typeof lesson.file === 'object' && lesson.file.name) {
              console.log(`Uploading file for lesson ${lessonId}:`, lesson.file.name);
              try {
                let uploadedFilename = null;
                
                if (dbContentType === 'mp4') {
                  uploadedFilename = await uploadService.uploadLessonMp4(lesson.file, lessonId);
                } else if (dbContentType === 'document') {
                  uploadedFilename = await uploadService.uploadLessonDocument(lesson.file, lessonId);
                } else if (dbContentType === 'scorm') {
                  uploadedFilename = await uploadService.uploadLessonScorm(lesson.file, lessonId);
                }
                
                console.log(`File uploaded successfully: ${uploadedFilename}`);
              } catch (uploadError) {
                console.error(`Failed to upload file for lesson ${lessonId}:`, uploadError);
                // Don't throw error, just log it - the lesson is still created
              }
            }

            // Handle ILTS if lesson type is ILTS
            if (lesson.lessonType === "ILTS") {
              console.log("Adding ILTS session for lesson:", lessonId);
              console.log("ILTS data received:", {
                iltsType: lesson.iltsType,
                iltsMode: lesson.iltsMode,
                iltsUrl: lesson.iltsUrl,
                meetUrl: lesson.meetUrl,
                eventVenue: lesson.eventVenue,
                venue: lesson.venue,
                startDate: lesson.startDate,
                startTime: lesson.startTime,
                endDate: lesson.endDate,
                endTime: lesson.endTime
              });

              // Prepare ILTS parameters with proper null handling
              const iltsMode = lesson.iltsType || lesson.iltsMode || "Online";
              const meetUrl = lesson.iltsUrl || lesson.meetUrl || null;
              const venue = lesson.eventVenue || lesson.venue || null;
              const startDate = lesson.startDate || null;
              const startTime = lesson.startTime || null;
              const endDate = lesson.endDate || null;
              const endTime = lesson.endTime || null;

              // Convert empty strings to null
              const cleanMeetUrl = (meetUrl === "" || meetUrl === undefined) ? null : meetUrl;
              const cleanVenue = (venue === "" || venue === undefined) ? null : venue;
              const cleanStartDate = (startDate === "" || startDate === undefined) ? null : startDate;
              const cleanStartTime = (startTime === "" || startTime === undefined) ? null : startTime;
              const cleanEndDate = (endDate === "" || endDate === undefined) ? null : endDate;
              const cleanEndTime = (endTime === "" || endTime === undefined) ? null : endTime;

              console.log("ILTS parameters for stored procedure:", {
                courseId,
                lessonId,
                iltsMode,
                cleanMeetUrl,
                cleanVenue,
                cleanStartDate,
                cleanStartTime,
                cleanEndDate,
                cleanEndTime,
                userId
              });

              try {
                const [iltsResult] = await connection.query(
                  "CALL add_ilts_session(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                  [
                    courseId,
                    lessonId,
                    iltsMode,
                    cleanMeetUrl,
                    cleanVenue,
                    cleanStartDate,
                    cleanStartTime,
                    cleanEndDate,
                    cleanEndTime,
                    userId,
                  ]
                );
                console.log("ILTS session added successfully for lesson:", lessonId);
              } catch (iltsError) {
                console.error("Error adding ILTS session for lesson", lessonId, ":", iltsError);
                // Don't throw error, just log it - the lesson is still created
              }
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
      // Update main course
      const [result] = await connection.query(
        "CALL update_instructor_course(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          courseId,
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
        console.log("Updating lessons, total count:", lessons.length);
        
        // Delete existing lessons and sections for this course
        console.log("Deleting existing lesson skills...");
        await connection.query(
          "DELETE FROM lesson_skills WHERE lesson_id IN (SELECT id FROM course_lesson WHERE course_id = ?)",
          [courseId]
        );
        console.log("Deleting existing ILTS records...");
        await connection.query("DELETE FROM ilts WHERE course_id = ?", [
          courseId,
        ]);
        console.log("Deleting existing lessons...");
        const lessonDeleteResult = await connection.query(
          "DELETE FROM course_lesson WHERE course_id = ?",
          [courseId]
        );
        console.log(`Deleted ${lessonDeleteResult[0].affectedRows} lessons`);
        console.log("Deleting existing sections...");
        const sectionDeleteResult = await connection.query(
          "DELETE FROM course_section WHERE course_id = ?",
          [courseId]
        );
        console.log(`Deleted ${sectionDeleteResult[0].affectedRows} sections`);

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
            console.log(`Update - Processing lesson: ${lesson.title}`);
            console.log(`Update - Processing lesson contentType: ${lesson.contentType}`);
            console.log(`Update - Processing lesson data:`, lesson);

            // Map frontend contentType to database enum values
            let dbContentType = null;
            let documentFile = null;
            let scormFile = null; 
            let mp4File = null;
            let contentUrl = null;

            if (lesson.contentType) {
              switch (lesson.contentType) {
                case 'mp4':
                  dbContentType = 'mp4';
                  mp4File = lesson.videoUpload || lesson.file;
                  break;
                case 'document':
                  dbContentType = 'document';
                  documentFile = lesson.lessonContentDocument || lesson.file;
                  break;
                case 'scorm':
                  dbContentType = 'scorm';
                  scormFile = lesson.scromPackage || lesson.file;
                  break;
                case 'url':
                  dbContentType = 'url';
                  contentUrl = lesson.contentUrl || lesson.url;
                  break;
                default:
                  dbContentType = lesson.contentType;
              }
            }

            console.log(`Update - Mapped content type: ${dbContentType}`);
            console.log(`Update - Document file: ${documentFile}`);
            console.log(`Update - SCORM file: ${scormFile}`);
            console.log(`Update - MP4 file: ${mp4File}`);
            console.log(`Update - Content URL: ${contentUrl}`);

            const [lessonResult] = await connection.query(
              "CALL add_course_lesson(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
              [
                lesson.title,
                sectionId,
                lesson.lessonType || "Content-Based",
                dbContentType,
                documentFile,
                scormFile,
                mp4File,
                contentUrl,
                lesson.lessonDuration || lesson.duration || null,
                courseId,
                userId,
                userId,
              ]
            );

            const lessonId = lessonResult[0][0].id;

            // Handle ILTS if lesson type is ILTS
            if (lesson.lessonType === "ILTS") {
              console.log("Update - Adding ILTS session for lesson:", lessonId);
              console.log("Update - ILTS data received:", {
                iltsType: lesson.iltsType,
                iltsMode: lesson.iltsMode,
                iltsUrl: lesson.iltsUrl,
                meetUrl: lesson.meetUrl,
                eventVenue: lesson.eventVenue,
                venue: lesson.venue,
                startDate: lesson.startDate,
                startTime: lesson.startTime,
                endDate: lesson.endDate,
                endTime: lesson.endTime
              });

              // Prepare ILTS parameters with proper null handling
              const iltsMode = lesson.iltsType || lesson.iltsMode || "Online";
              const meetUrl = lesson.iltsUrl || lesson.meetUrl || null;
              const venue = lesson.eventVenue || lesson.venue || null;
              const startDate = lesson.startDate || null;
              const startTime = lesson.startTime || null;
              const endDate = lesson.endDate || null;
              const endTime = lesson.endTime || null;

              // Convert empty strings to null
              const cleanMeetUrl = (meetUrl === "" || meetUrl === undefined) ? null : meetUrl;
              const cleanVenue = (venue === "" || venue === undefined) ? null : venue;
              const cleanStartDate = (startDate === "" || startDate === undefined) ? null : startDate;
              const cleanStartTime = (startTime === "" || startTime === undefined) ? null : startTime;
              const cleanEndDate = (endDate === "" || endDate === undefined) ? null : endDate;
              const cleanEndTime = (endTime === "" || endTime === undefined) ? null : endTime;

              console.log("Update - ILTS parameters for stored procedure:", {
                courseId,
                lessonId,
                iltsMode,
                cleanMeetUrl,
                cleanVenue,
                cleanStartDate,
                cleanStartTime,
                cleanEndDate,
                cleanEndTime,
                userId
              });

              try {
                const [iltsResult] = await connection.query(
                  "CALL add_ilts_session(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                  [
                    courseId,
                    lessonId,
                    iltsMode,
                    cleanMeetUrl,
                    cleanVenue,
                    cleanStartDate,
                    cleanStartTime,
                    cleanEndDate,
                    cleanEndTime,
                    userId,
                  ]
                );
                console.log("Update - ILTS session added successfully for lesson:", lessonId);
              } catch (iltsError) {
                console.error("Update - Error adding ILTS session for lesson", lessonId, ":", iltsError);
                // Don't throw error, just log it - the lesson is still created
              }
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
    console.log("Single lesson data:", lessonData);

    const connection = await promisePool.getConnection();
    try {
      await connection.beginTransaction();
      
      // Map frontend contentType to database enum values
      let dbContentType = null;
      let documentFile = null;
      let scormFile = null; 
      let mp4File = null;
      let contentUrl = null;

      if (lessonData.contentType) {
        switch (lessonData.contentType) {
          case 'mp4':
            dbContentType = 'mp4';
            mp4File = lessonData.videoUpload || lessonData.file;
            break;
          case 'document':
            dbContentType = 'document';
            documentFile = lessonData.lessonContentDocument || lessonData.file;
            break;
          case 'scorm':
            dbContentType = 'scorm';
            scormFile = lessonData.scromPackage || lessonData.file;
            break;
          case 'url':
            dbContentType = 'url';
            contentUrl = lessonData.contentUrl || lessonData.url;
            break;
          default:
            dbContentType = lessonData.contentType;
        }
      }

      console.log(`Single lesson - Mapped content type: ${dbContentType}`);
      console.log(`Single lesson - Document file: ${documentFile}`);
      console.log(`Single lesson - SCORM file: ${scormFile}`);
      console.log(`Single lesson - MP4 file: ${mp4File}`);
      console.log(`Single lesson - Content URL: ${contentUrl}`);

      const result = await connection.query(
        "INSERT INTO course_lesson (title, section_id, lesson_type, lesson_content_type, lesson_content_document, lesson_content_scorm, lesson_content_mp4, lesson_content_url, lesson_duration, course_id, creator_id, last_updated_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          lessonData.title,
          lessonData.sectionId,
          lessonData.lessonType || "Content-Based",
          dbContentType,
          documentFile,
          scormFile,
          mp4File,
          contentUrl,
          lessonData.lessonDuration || lessonData.duration || null,
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
