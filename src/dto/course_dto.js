class CourseDTO {
  constructor(courseData) {
    this.id = courseData.id;
    this.title = courseData.title;
    this.short_description = courseData.short_description || '';
    this.description = courseData.description || '';
    this.language_id = courseData.language_id;
    this.category_id = courseData.category_id;
    this.sub_category_id = courseData.sub_category_id;
    this.category_name = courseData.category_name || '';
    this.subcategory_name = courseData.subcategory_name || '';
    this.total_lessons = courseData.total_lessons || 0;
    this.level = courseData.level || 'beginner';
    this.course_duration = courseData.course_duration || '0 hours';
    this.thumbnail = courseData.thumbnail ? `/uploads/courses/thumbnail/${courseData.thumbnail}` : '';
    this.course_overview_provider = courseData.course_overview_provider || null;
    this.course_overview_video_url = courseData.course_overview_video_url || null;
    this.status = courseData.status || 'pending';
    this.meta_keywords = courseData.meta_keywords || '';
    this.meta_description = courseData.meta_description || '';
    this.created_at = courseData.created_at || new Date().toISOString();
    this.instructor = {
      id: courseData.creator_id || courseData.instructor_id,
      name: courseData.instructor_name || '',
      dp: courseData.instructor_dp ? `/uploads/users/profile_picture/${courseData.instructor_dp}` : null,
      about: courseData.instructor_about || '',
      social_links: courseData.instructor_social_links ? 
        (typeof courseData.instructor_social_links === 'string' ? 
          JSON.parse(courseData.instructor_social_links) : 
          courseData.instructor_social_links) : 
        null,
      avg_rating: parseFloat(courseData.avg_rating) || 0
    };
    this.avg_rating = parseFloat(courseData.avg_rating) || 0;
    this.enrolled_date = courseData.enrolled_date || null;
    this.is_enrolled = !!courseData.enrolled_date;
    this.completedLessons = courseData.completedLessons || 0;
    this.keyword_match_count = courseData.keyword_match_count || 0;
    this.similarity_score = courseData.similarity_score || 0;
    this.recommendation_type = courseData.recommendation_type || '';
  }
}

class CourseReviewDTO {
  constructor(reviewData) {
    this.id = reviewData.id;
    this.rating = reviewData.rating;
    this.review = reviewData.review || '';
    this.date_added = reviewData.date_added || new Date().toISOString();
    this.user = {
      id: reviewData.user_id,
      name: reviewData.user_name || 'Anonymous',
      avatar: reviewData.user_avatar ? `/uploads/users/profile_picture/${reviewData.user_avatar}` : null,
      role: reviewData.user_role || 'student'
    };
  }
}

class CourseProgressDTO {
  constructor(progressData) {
    this.course_id = progressData.course_id;
    this.course_title = progressData.course_title || '';
    this.total_lessons = progressData.total_lessons || 0;
    this.total_lessons_available = progressData.total_lessons_available || 0;
    this.lessons_started = progressData.lessons_started || 0;
    this.lessons_completed = progressData.lessons_completed || 0;
    this.progress_percentage = progressData.progress_percentage || 0;
    this.last_accessed = progressData.last_accessed || null;
    this.last_accessed_lesson = {
      id: progressData.last_accessed_lesson_id || null,
      title: progressData.last_accessed_lesson_title || ''
    };
  }
}

class CourseSkillDTO {
  constructor(skillData) {
    this.skill_id = skillData.id || skillData.skill_id;
    this.skill_name = skillData.skill_name || '';
    this.lesson_count = skillData.lesson_count || 0;
    this.last_achieved_date = skillData.last_achieved_date || null;
    this.is_achieved = !!skillData.last_achieved_date;
  }
}

class SkillSummaryDTO {
  constructor(summaryData) {
    this.skills = (summaryData.skills || []).map(skill => new CourseSkillDTO(skill));
    this.total_count = summaryData.total_count || 0;
    this.achieved_count = summaryData.achieved_count || 0;
    this.remaining_count = summaryData.remaining_count || 0;
  }
}

class CourseRequirementDTO {
  constructor(requirementData) {
    this.id = requirementData.id || requirementData.requirement_id;
    this.content = requirementData.content || requirementData.requirement || '';
  }
}

class CourseOutcomeDTO {
  constructor(outcomeData) {
    this.id = outcomeData.id;
    this.content = outcomeData.content || outcomeData.outcome || '';
  }
}

class CourseFaqDTO {
  constructor(faqData) {
    this.id = faqData.id;
    this.question = faqData.question || '';
    this.answer = faqData.answer || '';
  }
}


class CourseDetailDTO {
  constructor(courseData) {
    Object.assign(this, new CourseDTO(courseData));
    this.requirements = (courseData.requirements || []).map(req => new CourseRequirementDTO(req));
    this.outcomes = (courseData.outcomes || []).map(out => new CourseOutcomeDTO(out));
    this.faqs = (courseData.faqs || []).map(faq => new CourseFaqDTO(faq));
    this.skills = (courseData.skills || []).map(skill => new CourseSkillDTO(skill));
    
    // Group lessons by section
    const lessonsBySection = {};
    (courseData.lessons || []).forEach(lesson => {
      if (!lessonsBySection[lesson.section_id]) {
        lessonsBySection[lesson.section_id] = [];
      }
      lessonsBySection[lesson.section_id].push(lesson);
    });
    
    this.sections = (courseData.sections || []).map(section => {
      const sectionWithLessons = {
        ...section,
        lessons: lessonsBySection[section.id] || []
      };
      return new CourseSectionDTO(sectionWithLessons);
    });
    
    this.reviews = (courseData.reviews || []).map(review => new CourseReviewDTO(review));
    this.rating_stats = courseData.rating_stats || {
      average: 0,
      total: 0,
      breakdown: null
    };
    this.progress = courseData.progress ? new CourseProgressDTO(courseData.progress) : null;
    this.achieved_skills = (courseData.achieved_skills || []).map(skill => new CourseSkillDTO(skill));
  }
}

class CourseLessonDTO {
  constructor(lessonData) {
    this.id = lessonData.id || lessonData.lesson_id;
    this.title = lessonData.title;
    this.section_id = lessonData.section_id;
    this.lessonType = lessonData.lesson_type;
    this.isCompleted = !!lessonData.is_completed || !!lessonData.completed;
    this.isUnlocked = !!lessonData.is_unlocked;
    this.last_accessed = lessonData.last_accessed || null;
    this.duration = lessonData.lesson_duration || lessonData.duration || '0 mins';
    this.progress = lessonData.progress || 0;

    if (lessonData.lesson_type === 'Content-Based') {
      // Map content type field names
      this.contentType = lessonData.content_type || lessonData.contentType;

      // Map the appropriate URL field to contentUrl based on content type
      let contentUrl = '';
      if (this.contentType === 'document') {
        contentUrl = lessonData.documentUrl || lessonData.lesson_content_document || '';
      } else if (this.contentType === 'mp4') {
        contentUrl = lessonData.videoUrl || lessonData.lesson_content_mp4 || '';
      } else if (this.contentType === 'scorm') {
        contentUrl = lessonData.scormUrl || lessonData.lesson_content_scorm || '';
      } else if (this.contentType === 'url') {
        contentUrl = lessonData.externalUrl || lessonData.lesson_content_url || '';
      }

      this.contentUrl = contentUrl;

      // Quiz/Assessment fields
      if (this.contentType === 'quiz') {
        this.assessmentId = lessonData.assessment_id || null;
        this.requireSectionCompletion = !!lessonData.require_section_completion;
        this.assessmentStartDate = lessonData.assessment_start_date || null;
        this.assessmentEndDate = lessonData.assessment_end_date || null;
      }
    } else if (lessonData.lesson_type === 'ILTS') {
      this.iltsMode = lessonData.venue ? 'Offline' : 'Online';
      this.iltsInfo = {
        mode: lessonData.venue ? 'Offline' : 'Online',
        meet_url: lessonData.meet_url || null,
        venue: lessonData.venue || null,
        start_date: lessonData.start_date || null,
        start_time: lessonData.start_time || null,
        end_date: lessonData.end_date || null,
        end_time: lessonData.end_time || null
      };

      if (lessonData.venue) {
        this.iltsInfo.message = `Attend in person at ${lessonData.venue} on ${lessonData.start_date} at ${lessonData.start_time}`;
      }
    }
  }
}


class CourseSectionDTO {
  constructor(sectionData) {
    this.id = sectionData.id;
    this.title = sectionData.title || '';
    this.lessons_count = sectionData.lessons_count || 0;
    this.lessons = (sectionData.lessons || []).map(lesson => new CourseLessonDTO(lesson));
  }
}

class RatingStatsDTO {
  constructor({
    average_rating = 0,
    total_ratings = 0,
    rating_breakdown = null
  }) {
    this.average = parseFloat(average_rating) || 0;
    this.total = parseInt(total_ratings) || 0;
    this.breakdown = typeof rating_breakdown === 'string' ? 
      JSON.parse(rating_breakdown) : 
      (rating_breakdown || {
        '5': 0,
        '4': 0,
        '3': 0,
        '2': 0,
        '1': 0
      });
  }
}

module.exports = {
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
  RatingStatsDTO ,
  CourseLessonDTO
};