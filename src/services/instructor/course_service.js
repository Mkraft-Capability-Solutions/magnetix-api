const { promisePool } = require('../../config/db');
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
    DTOTransformer } = require('../../dto/instructor/course_dto'); 

class InstructorCourseService {
    async addCourse(userId, courseData) {
        const {
            title, shortDescription, description, languageId, categoryId, subCategoryId,
            level, courseDuration, thumbnail, courseOverviewProvider, courseOverviewVideoUrl,
            metaKeywords, metaDescription, outcomes, requirements, faqs, sections
        } = courseData;

        const connection = await promisePool.getConnection();
        await connection.beginTransaction();

        try {
            // Add main course
            const [result] = await connection.query(
                'CALL add_instructor_course(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [
                    userId, title, shortDescription, description, languageId, categoryId,
                    subCategoryId, level, courseDuration, thumbnail, courseOverviewProvider,
                    courseOverviewVideoUrl, metaKeywords, metaDescription
                ]
            );
            
            const courseId = result[0][0].id;

            if (!courseId) {
                throw new Error('Failed to create course');
            }

            // Add outcomes
            if (outcomes && outcomes.length > 0) {
                for (const outcome of outcomes) {
                    await connection.query(
                        'CALL add_course_outcome(?, ?, ?, ?)',
                        [outcome, courseId, userId, userId]
                    );
                }
            }

            // Add requirements
            if (requirements && requirements.length > 0) {
                for (const requirement of requirements) {
                    await connection.query(
                        'CALL add_course_requirement(?, ?, ?, ?)',
                        [requirement, courseId, userId, userId]
                    );
                }
            }

            // Add FAQs
            if (faqs && faqs.length > 0) {
                for (const faq of faqs) {
                    await connection.query(
                        'CALL add_course_faq(?, ?, ?, ?, ?)',
                        [faq.question, faq.answer, courseId, userId, userId]
                    );
                }
            }

            // Add sections and lessons
            if (sections && sections.length > 0) {
                for (const section of sections) {
                    const [sectionResult] = await connection.query(
                        'CALL add_course_section(?, ?, ?, ?)',
                        [section.title, courseId, userId, userId]
                    );
                    
                    const sectionId = sectionResult[0][0].id;

                    if (section.lessons && section.lessons.length > 0) {
                        for (const lesson of section.lessons) {
                            const [lessonResult] = await connection.query(
                                'CALL add_course_lesson(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                                [
                                    lesson.title, sectionId, lesson.lessonType, lesson.lessonContentType,
                                    lesson.lessonContentDocument, lesson.lessonContentScorm, lesson.lessonContentMp4,
                                    lesson.lessonContentUrl, lesson.lessonDuration, courseId, userId, userId
                                ]
                            );
                            
                            const lessonId = lessonResult[0][0].id;

                            if (lesson.lessonType === 'ILTS') {
                                await connection.query(
                                    'CALL add_ilts_session(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                                    [
                                        courseId, lessonId, lesson.iltsMode, lesson.meetUrl, lesson.venue,
                                        lesson.startDate, lesson.startTime, lesson.endDate, lesson.endTime,
                                        userId
                                    ]
                                );
                            }

                            if (lesson.skills && lesson.skills.length > 0) {
                                for (const skillName of lesson.skills) {
                                    const [skillResult] = await connection.query(
                                        'CALL add_or_get_skill(?, ?)',
                                        [skillName, userId]
                                    );
                                    
                                    const skillId = skillResult[0][0].id;
                                    await connection.query(
                                        'CALL add_lesson_skill(?, ?)',
                                        [lessonId, skillId]
                                    );
                                }
                            }
                        }
                    }
                }
            }

            await connection.commit();
            connection.release();
            return { success: true, courseId };
        } catch (error) {
            await connection.rollback();
            connection.release();
            throw error;
        }
    }

    async updateCourse(userId, courseId, courseData) {
        const {
            title, shortDescription, description, languageId, categoryId, subCategoryId,
            level, courseDuration, thumbnail, courseOverviewProvider, courseOverviewVideoUrl,
            metaKeywords, metaDescription, outcomes, requirements, faqs
        } = courseData;

        const connection = await promisePool.getConnection();
        await connection.beginTransaction();

        try {
            // Update main course
            const [result] = await connection.query(
                'CALL update_instructor_course(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [
                    courseId, userId, title, shortDescription, description, languageId, categoryId,
                    subCategoryId, level, courseDuration, thumbnail, courseOverviewProvider,
                    courseOverviewVideoUrl, metaKeywords, metaDescription
                ]
            );
            
            if (result.affectedRows === 0) {
                throw new Error('Course not found or not authorized to update');
            }

            // Update outcomes
            await connection.query('CALL delete_course_outcomes(?)', [courseId]);
            if (outcomes && outcomes.length > 0) {
                for (const outcome of outcomes) {
                    await connection.query(
                        'CALL add_course_outcome(?, ?, ?, ?)',
                        [outcome, courseId, userId, userId]
                    );
                }
            }

            // Update requirements
            await connection.query('CALL delete_course_requirements(?)', [courseId]);
            if (requirements && requirements.length > 0) {
                for (const requirement of requirements) {
                    await connection.query(
                        'CALL add_course_requirement(?, ?, ?, ?)',
                        [requirement, courseId, userId, userId]
                    );
                }
            }

            // Update FAQs
            await connection.query('CALL delete_course_faqs(?)', [courseId]);
            if (faqs && faqs.length > 0) {
                for (const faq of faqs) {
                    await connection.query(
                        'CALL add_course_faq(?, ?, ?, ?, ?)',
                        [faq.question, faq.answer, courseId, userId, userId]
                    );
                }
            }

            await connection.commit();
            connection.release();
            return { success: true };
        } catch (error) {
            await connection.rollback();
            connection.release();
            throw error;
        }
    }

    async deleteCourse(userId, courseId) {
        const connection = await promisePool.getConnection();
        try {
            const [result] = await connection.query(
                'CALL delete_instructor_course(?, ?)',
                [courseId, userId]
            );
            
            if (result.affectedRows === 0) {
                throw new Error('Course not found or not authorized to delete');
            }
            
            return { success: true };
        } finally {
            connection.release();
        }
    }

    // getActiveCourses
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
        const [rows] = await promisePool.query('CALL get_all_categories()');
        return rows[0];
    }

    async getSubCategories() {
        const [rows] = await promisePool.query('CALL get_all_subcategories()');
        return rows[0];
    }

    async getLanguages() {
        const [rows] = await promisePool.query('CALL get_all_languages()');
        return rows[0];
    }

    async getEnrolledStudents(courseId, userId) {
        const [rows] = await promisePool.query(
            'CALL get_enrolled_students_with_progress(?, ?)',
            [courseId, userId]
        );
        return rows[0].map(data => new EnrolledStudentDTO(data));
    }

    async getCourseDetailsById(courseId, userId) {
        const [results] = await promisePool.query(
            'CALL get_course_details_by_id(?, ?)',
            [courseId, userId]
        );

        if (!results[0][0]) {
            throw new Error('Course not found or not authorized');
        }

        // Transform the results into a structured object
        const courseDetails = {
            course: new CourseDTO(results[0][0]),
            outcomes: results[1].map(outcome => new CourseOutcomeDTO(outcome)),
            requirements: results[2].map(req => new CourseRequirementDTO(req)),
            faqs: results[3].map(faq => new CourseFAQDTO(faq)),
            sections: results[4].map(section => new CourseSectionDTO(section)),
            lessons: [], // This will be populated from the lessons data
            skills: []  // This will be populated from the skills data
        };

        // Process lessons and ILTS details
        const lessonsMap = {};
        results[5].forEach(lessonData => {
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
                    end_time: lessonData.end_time
                });
            }
            lessonsMap[lesson.id] = lesson;
            courseDetails.lessons.push(lesson); // Add lesson to lessons array
        });

        // Process skills
        results[6].forEach(skillData => {
            if (!lessonsMap[skillData.lesson_id]) return;
            if (!lessonsMap[skillData.lesson_id].skills) {
                lessonsMap[skillData.lesson_id].skills = [];
            }
            lessonsMap[skillData.lesson_id].skills.push(skillData.skill_name);
            courseDetails.skills.push({ // Add skill to skills array
                lessonId: skillData.lesson_id,
                skillId: skillData.skill_id,
                skillName: skillData.skill_name
            });
        });

        // Group lessons by section
        courseDetails.sections.forEach(section => {
            section.lessons = Object.values(lessonsMap)
                .filter(lesson => lesson.sectionId === section.id)
                .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        });

        return courseDetails;
    }


    async getEnrolledStudentsWithProgress(courseId) {
    const [rows] = await promisePool.query(
        'CALL get_enrolled_students_with_progress(?)',
        [courseId]
    );

    return rows[0].map(data => ({
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
        lastAccessedLessonTitle: data.last_accessed_lesson_title
    }));
}


}

module.exports = new InstructorCourseService();