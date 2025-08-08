const { promisePool } = require('../../config/db');
const { CourseDTO, EnrolledStudentDTO } = require('../../dto/instructor/course_dto'); // Update import

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

    async getActiveCourses(userId, limit = 10, offset = 0) {
        const [rows] = await promisePool.query(
            'CALL get_instructor_active_courses(?, ?, ?)',
            [userId, limit, offset]
        );
        return rows[0].map(CourseDTO.courseToDTO); 
    }

    async getPendingCourses(userId, limit = 10, offset = 0) {
        const [rows] = await promisePool.query(
            'CALL get_instructor_pending_courses(?, ?, ?)',
            [userId, limit, offset]
        );
        return rows[0].map(CourseDTO.courseToDTO); 
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
}

module.exports = new InstructorCourseService();