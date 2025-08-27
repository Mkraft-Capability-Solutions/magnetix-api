class CourseDTO {
    constructor(data) {
        this.id = data.id;
        this.title = data.title || data.course_title;
        this.shortDescription = data.short_description || data.shortDescription;
        this.description = data.description || data.course_description;
        this.languageId = data.language_id || data.languageId;
        this.categoryId = data.category_id || data.categoryId;
        this.subCategoryId = data.sub_category_id || data.subCategoryId;
        this.totalLessons = data.total_lessons || data.totalLessons || 0;
        this.level = data.level || 'beginner';
        this.courseDuration = data.course_duration || data.courseDuration;
        this.thumbnail = data.thumbnail || data.course_thumbnail;
        this.overviewProvider = data.course_overview_provider || data.overviewProvider;
        this.overviewVideoUrl = data.course_overview_video_url || data.overviewVideoUrl;
        // Add mediaType mapping for frontend compatibility
        this.mediaType = data.course_overview_provider || data.mediaType || data.overviewProvider;
        this.mediaUrl = data.course_overview_video_url || data.mediaUrl || data.overviewVideoUrl;
        this.status = data.status || 'pending';
        this.metaKeywords = data.meta_keywords || data.metaKeywords;
        this.metaDescription = data.meta_description || data.metaDescription;
        this.isDeleted = Boolean(data.is_deleted || data.isDeleted || false);
        this.createdAt = data.created_at || data.createdDate || new Date().toISOString();
        this.updatedAt = data.last_updated || data.updatedAt || this.createdAt;
        this.creatorId = data.creator_id || data.creatorId;
        
        this.instructorName = data.instructorName || data.instructor_name;
        this.instructorDp = data.instructorDp || data.instructor_dp || data.dp;
        this.instructorAbout = data.instructorAbout || data.instructor_about || data.about;
        this.instructorSocialLinks = data.instructorSocialLinks || data.social_links;
        this.instructorExpertise = data.instructorExpertise || data.expertise;
    }

    static fromDatabase(data) {
        return new CourseDTO(data);
    }

    static fromRequest(data) {
        return new CourseDTO({
            ...data,
            language_id: data.languageId,
            category_id: data.categoryId,
            sub_category_id: data.subCategoryId
        });
    }

    static courseToDTO(data) {
        return new CourseDTO({
            id: data.id,
            title: data.title,
            short_description: data.shortDescription || data.short_description,
            description: data.description,
            language_id: data.languageId || data.language_id,
            category_id: data.categoryId || data.category_id,
            sub_category_id: data.subCategoryId || data.sub_category_id,
            total_lessons: data.totalLessons || data.total_lessons,
            level: data.level,
            course_duration: data.courseDuration || data.course_duration,
            thumbnail: data.thumbnail,
            status: data.status,
            created_at: data.createdAt || data.created_at,
            creator_id: data.creatorId || data.creator_id,
            instructorName: data.instructorName || data.instructor_name,
            instructorDp: data.instructorDp || data.dp,
            instructorAbout: data.instructorAbout || data.about,
            instructorSocialLinks: data.instructorSocialLinks || data.social_links,
            instructorExpertise: data.instructorExpertise || data.expertise,
        });
    }

    static courseDetailsToDTO(data) {
        return {
            course: new CourseDTO(data.course),
            outcomes: data.outcomes ? this.transformCollection(data.outcomes, CourseOutcomeDTO) : [],
            requirements: data.requirements ? this.transformCollection(data.requirements, CourseRequirementDTO) : [],
            faqs: data.faqs ? this.transformCollection(data.faqs, CourseFAQDTO) : [],
            sections: data.sections ? this.transformCollection(data.sections, CourseSectionDTO) : []
        };
    }
}

class CourseOutcomeDTO {
    constructor(data) {
        this.id = data.id;
        this.outcome = data.outcome || data.learning_outcome;
        this.courseId = data.course_id || data.courseId;
        this.createdAt = data.created_date || data.createdAt || new Date().toISOString();
        this.updatedAt = data.last_updated || data.updatedAt || this.createdAt;
    }

    static fromDatabase(data) {
        return new CourseOutcomeDTO(data);
    }
}

class CourseRequirementDTO {
    constructor(data) {
        this.id = data.id;
        this.requirement = data.requirement || data.course_requirement;
        this.courseId = data.course_id || data.courseId;
        this.createdAt = data.created_date || data.createdAt || new Date().toISOString();
        this.updatedAt = data.last_updated || data.updatedAt || this.createdAt;
    }

    static fromDatabase(data) {
        return new CourseRequirementDTO(data);
    }
}

class CourseFAQDTO {
    constructor(data) {
        this.id = data.id;
        this.question = data.question || data.faq_question;
        this.answer = data.answer || data.faq_answer;
        this.courseId = data.course_id || data.courseId;
        this.createdAt = data.created_date || data.createdAt || new Date().toISOString();
        this.updatedAt = data.last_updated || data.updatedAt || this.createdAt;
    }

    static fromDatabase(data) {
        return new CourseFAQDTO(data);
    }
}

class CourseSectionDTO {
    constructor(data) {
        this.id = data.id;
        this.title = data.title || data.section_title;
        this.courseId = data.course_id || data.courseId;
        this.order = data.order || data.section_order || 0;
        this.createdAt = data.created_date || data.createdAt || new Date().toISOString();
        this.updatedAt = data.last_updated || data.updatedAt || this.createdAt;
    }

    static fromDatabase(data) {
        return new CourseSectionDTO(data);
    }
}

class CourseLessonDTO {
    constructor(data) {
        this.id = data.id;
        this.title = data.title || data.lesson_title;
        this.sectionId = data.section_id || data.sectionId;
        this.lessonType = data.lesson_type || data.type || 'Content-Based';
        this.contentType = data.lesson_content_type || data.contentType;
        this.contentDocument = data.lesson_content_document || data.contentDocument;
        this.contentScorm = data.lesson_content_scorm || data.contentScorm;
        this.contentMp4 = data.lesson_content_mp4 || data.contentMp4;
        this.contentUrl = data.lesson_content_url || data.contentUrl;
        this.duration = data.lesson_duration || data.duration || '00:00';
        this.description = data.description || data.lesson_description || '';
        this.courseId = data.course_id || data.courseId;
        
        // Map database lesson_type to frontend type
        if (this.lessonType === 'Content-Based') {
            this.type = 'content';
        } else if (this.lessonType === 'ILTS') {
            this.type = 'live';
        } else {
            this.type = this.lessonType;
        }

        // Map content files for frontend compatibility
        this.file = null;
        if (this.contentDocument) this.file = this.contentDocument;
        if (this.contentScorm) this.file = this.contentScorm;
        if (this.contentMp4) this.file = this.contentMp4;

        // Map content type for frontend
        if (this.contentType === 'mp4') {
            this.contentType = 'video';
        } else if (this.contentType === 'content_url') {
            this.contentType = 'url';
        }

        this.createdAt = data.created_date || data.createdAt || new Date().toISOString();
        this.updatedAt = data.last_updated || data.updatedAt || this.createdAt;
    }

    static fromDatabase(data) {
        return new CourseLessonDTO(data);
    }

    withILTSDetails(iltsData) {
        if (this.lessonType === 'ILTS') {
            this.iltsDetails = new ILTSDTO(iltsData);
        }
        return this;
    }
}

class ILTSDTO {
    constructor(data) {
        this.id = data.id;
        this.courseId = data.course_id || data.courseId;
        this.lessonId = data.lesson_id || data.lessonId;
        this.mode = data.lesson_mode || data.mode;
        this.meetUrl = data.meet_url || data.meetUrl;
        this.venue = data.venue || data.meeting_venue;
        this.startDate = data.start_date || data.startDate;
        this.startTime = data.start_time || data.startTime;
        this.endDate = data.end_date || data.endDate;
        this.endTime = data.end_time || data.endTime;
        this.createdAt = data.created_date || data.createdAt || new Date().toISOString();
        this.updatedAt = data.last_updated || data.updatedAt || this.createdAt;
    }

    static fromDatabase(data) {
        return new ILTSDTO(data);
    }
}

class EnrolledStudentDTO {
    constructor(data) {
        this.userId = data.user_id || data.userId;
        this.email = data.email || data.user_email;
        this.firstName = data.first_name || data.firstName;
        this.lastName = data.last_name || data.lastName;
        this.profileImage = data.dp || data.profileImage;
        this.enrolledDate = data.enrolled_date || data.enrolledAt || new Date().toISOString();
        this.lastAccess = data.last_access || data.lastAccessedAt;
        this.progress = data.progress ? Math.round(data.progress) : 0;
        this.completedLessons = data.completed_lessons || data.completedLessons || 0;
        this.totalLessons = data.total_lessons || data.totalLessons || 0;
    }

    static fromDatabase(data) {
        return new EnrolledStudentDTO(data);
    }

    static enrolledStudentToDTO(data) {
        return {
            userId: data.user_id || data.userId,
            email: data.email,
            firstName: data.first_name || data.firstName,
            lastName: data.last_name || data.lastName,
            profileImage: data.dp || data.profileImage,
            enrolledDate: data.enrolled_date || data.enrolledDate,
            lastAccess: data.last_access || data.lastAccess,
            progress: data.progress ? Math.round(data.progress) : 0,
            completedLessons: data.completed_lessons || data.completedLessons || 0,
            totalLessons: data.total_lessons || data.totalLessons || 0
        };
    }
}

class SkillDTO {
    constructor(data) {
        this.id = data.id;
        this.name = data.skill_name || data.name;
        this.createdAt = data.created_date || data.createdAt || new Date().toISOString();
    }

    static fromDatabase(data) {
        return new SkillDTO(data);
    }
}

class DTOTransformer {
    static transformCollection(collection, DTOClass) {
        return collection.map(item => new DTOClass(item));
    }

    static transformCourseWithRelations(courseData, relations = {}) {
        const course = new CourseDTO(courseData);
        
        if (relations.outcomes) {
            course.outcomes = this.transformCollection(relations.outcomes, CourseOutcomeDTO);
        }
        
        if (relations.requirements) {
            course.requirements = this.transformCollection(relations.requirements, CourseRequirementDTO);
        }
        
        if (relations.faqs) {
            course.faqs = this.transformCollection(relations.faqs, CourseFAQDTO);
        }
        
        if (relations.sections) {
            course.sections = this.transformCollection(relations.sections, CourseSectionDTO);
        }
        
        return course;
    }
}

module.exports = {
    CourseDTO,
    CourseOutcomeDTO,
    CourseRequirementDTO,
    CourseFAQDTO,
    CourseSectionDTO,
    CourseLessonDTO,
    ILTSDTO,
    EnrolledStudentDTO,
    SkillDTO,
    DTOTransformer
};