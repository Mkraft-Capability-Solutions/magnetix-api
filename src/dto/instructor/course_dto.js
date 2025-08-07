class CourseDTO {
  constructor(courseData) {
    this.id = courseData.id;
    this.title = courseData.title;
    this.short_description = courseData.short_description;
    this.description = courseData.description;
    this.language_id = courseData.language_id;
    this.category_id = courseData.category_id;
    this.sub_category_id = courseData.sub_category_id;
    this.total_lessons = courseData.total_lessons || 0;
    this.level = courseData.level;
    this.course_duration = courseData.course_duration;
    this.thumbnail = courseData.thumbnail;
    this.course_overview_provider = courseData.course_overview_provider;
    this.course_overview_video_url = courseData.course_overview_video_url;
    this.course_type = courseData.course_type || 'video';
    this.status = courseData.status || 'pending';
    this.meta_keywords = courseData.meta_keywords;
    this.meta_description = courseData.meta_description;
    this.created_at = courseData.created_at;
    this.last_updated = courseData.last_updated;
    this.sections = courseData.sections || [];
    this.faqs = courseData.faqs || [];
    this.requirements = courseData.requirements || [];
    this.outcomes = courseData.outcomes || [];
  }
}

class LessonDTO {
  constructor(lessonData) {
    this.id = lessonData.id;
    this.title = lessonData.title;
    this.section_id = lessonData.section_id;
    this.lesson_type = lessonData.lesson_type || 'Content-Based';
    this.lesson_content_type = lessonData.lesson_content_type || 'document';
    this.lesson_content_document = lessonData.lesson_content_document;
    this.lesson_content_scorm = lessonData.lesson_content_scorm;
    this.lesson_content_mp4 = lessonData.lesson_content_mp4;
    this.lesson_content_url = lessonData.lesson_content_url;
    this.lesson_duration = lessonData.lesson_duration;
    this.course_id = lessonData.course_id;
    this.skills = lessonData.skills || [];
    this.ilts_details = lessonData.ilts_details || null;
  }
}

class SectionDTO {
  constructor(sectionData) {
    this.id = sectionData.id;
    this.title = sectionData.title;
    this.course_id = sectionData.course_id;
    this.lessons = sectionData.lessons || [];
  }
}


module.exports = {
  CourseDTO,
  LessonDTO,
  SectionDTO
};