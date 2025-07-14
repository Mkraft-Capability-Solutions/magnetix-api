class CourseDTO {
  constructor(courseData) {
    this.id = courseData.id;
    this.title = courseData.title;
    this.short_description = courseData.short_description;
    this.description = courseData.description;
    this.language_id = courseData.language_id;
    this.category_id = courseData.category_id;
    this.sub_category_id = courseData.sub_category_id;
    this.category_name = courseData.category_name;
    this.subcategory_name = courseData.subcategory_name;
    this.total_lessons = courseData.total_lessons;
    this.level = courseData.level;
    this.course_duration = courseData.course_duration;
    this.thumbnail = courseData.thumbnail;
    this.course_overview_provider = courseData.course_overview_provider;
    this.course_overview_video_url = courseData.course_overview_video_url;
    this.status = courseData.status;
    this.meta_keywords = courseData.meta_keywords;
    this.meta_description = courseData.meta_description;
    this.created_at = courseData.created_at;
    this.instructor_id = courseData.instructor_id;
    this.instructor_name = courseData.instructor_name;
    this.instructor_dp = courseData.instructor_dp;
    this.instructor_about = courseData.instructor_about;
    this.avg_rating = parseFloat(courseData.average_rating) || 0;
    this.enrolled_date = courseData.enrolled_date;
    this.keyword_match_count = courseData.keyword_match_count || 0;
    this.similarity_score = courseData.similarity_score || 0;
    this.recommendation_type = courseData.recommendation_type || '';
  }
}

class CourseRatingDTO {
  constructor(ratingData) {
    this.id = ratingData.id;
    this.rating = ratingData.rating;
    this.review = ratingData.review;
    this.date_added = ratingData.date_added;
    this.user_id = ratingData.user_id;
    this.user_name = ratingData.user_name;
    this.user_avatar = ratingData.user_avatar;
    this.user_role = ratingData.user_role;
  }
}

class CourseReviewDTO {
  constructor(reviewData) {
    this.id = reviewData.id;
    this.rating = reviewData.rating;
    this.review = reviewData.review;
    this.date_added = reviewData.date_added;
    this.user_id = reviewData.user_id;
    this.user_name = reviewData.user_name;
    this.user_avatar = reviewData.user_avatar;
    this.user_role = reviewData.user_role;
  }
}

class CourseProgressDTO {
  constructor(progressData) {
    this.course_id = progressData.course_id;
    this.course_title = progressData.course_title;
    this.total_lessons = progressData.total_lessons;
    this.total_lessons_available = progressData.total_lessons_available;
    this.lessons_started = progressData.lessons_started;
    this.lessons_completed = progressData.lessons_completed;
    this.progress_percentage = progressData.progress_percentage;
    this.last_accessed = progressData.last_accessed;
    this.last_accessed_lesson_title = progressData.last_accessed_lesson_title;
    this.last_accessed_lesson_id = progressData.last_accessed_lesson_id;
  }
}

class SavedCourseDTO {
  constructor(savedCourseData) {
    this.id = savedCourseData.id;
    this.user_id = savedCourseData.user_id;
    this.course_id = savedCourseData.course_id;
    this.saved_date = savedCourseData.saved_date;
    this.course = savedCourseData.course ? new CourseDTO(savedCourseData.course) : null;
  }
}

class CourseSectionDTO {
  constructor(sectionData) {
    this.id = sectionData.id;
    this.course_id = sectionData.course_id;
    this.title = sectionData.title;
  }
}

class ContentBasedLessonDetailsDTO {
  constructor(contentData) {
    this.content_type = contentData.content_type;
    this.document = contentData.document;
    this.scorm = contentData.scorm;
    this.mp4 = contentData.mp4;
    this.url = contentData.url;
    this.duration = contentData.duration;
  }
}

class ILTSLessonDetailsDTO {
  constructor(iltsData) {
    this.mode = iltsData.mode;
    this.meet_url = iltsData.meet_url;
    this.venue = iltsData.venue;
    this.start_date = iltsData.start_date;
    this.start_time = iltsData.start_time;
    this.end_date = iltsData.end_date;
    this.end_time = iltsData.end_time;
  }
}

class CourseLessonDTO {
  constructor(lessonData) {
    this.id = lessonData.id;
    this.course_id = lessonData.course_id;
    this.section_id = lessonData.section_id;
    this.title = lessonData.title;
    this.lesson_type = lessonData.lesson_type;
    this.total_lessons = lessonData.total_lessons;
    
    // Handle lesson details based on type
    if (lessonData.lesson_details) {
      const details = JSON.parse(lessonData.lesson_details);
      if (lessonData.lesson_type === 'Content-Based') {
        this.lesson_details = new ContentBasedLessonDetailsDTO(details);
      } else if (lessonData.lesson_type === 'ILTS') {
        this.lesson_details = new ILTSLessonDetailsDTO(details);
      } else {
        this.lesson_details = null;
      }
    } else {
      this.lesson_details = null;
    }
  }
}

class LessonSkillDTO {
  constructor(skillData) {
    this.skill_id = skillData.skill_id;
    this.skill_name = skillData.skill_name;
  }
}

class CourseOutcomeDTO {
  constructor(outcomeData) {
    this.id = outcomeData.id;
    this.course_id = outcomeData.course_id;
    this.outcome = outcomeData.outcome;
  }
}

class CourseRequirementDTO {
  constructor(requirementData) {
    this.id = requirementData.id;
    this.course_id = requirementData.course_id;
    this.requirement = requirementData.requirement;
  }
}

class CourseFaqDTO {
  constructor(faqData) {
    this.id = faqData.id;
    this.course_id = faqData.course_id;
    this.question = faqData.question;
    this.answer = faqData.answer;
    this.faq_order = faqData.faq_order;
  }
}

class AchievedSkillDTO {
  constructor(skillData) {
    this.skill_id = skillData.skill_id;
    this.skill_name = skillData.skill_name;
    this.achieved_date = skillData.achieved_date;
  }
}

class EnrolledCourseDetailDTO {
  constructor(data) {
    this.course = data.courseDetails[0] ? new CourseDTO({
      ...data.courseDetails[0],
      instructor_name: data.courseDetails[0].instructor_name,
      instructor_dp: data.courseDetails[0].instructor_dp,
      instructor_about: data.courseDetails[0].instructor_about,
      average_rating: parseFloat(data.courseDetails[0].average_rating) || 0
    }) : null;
    this.course_sections = data.courseSections.map(section => new CourseSectionDTO(section));
    this.course_lessons = data.courseLessons.map(lesson => new CourseLessonDTO(lesson));
    this.lesson_skills = data.lessonSkills.map(skill => new LessonSkillDTO(skill));
    this.course_reviews = data.courseReviews.map(review => new CourseReviewDTO(review));
    this.course_outcomes = data.courseOutcomes.map(outcome => new CourseOutcomeDTO(outcome));
    this.course_requirements = data.courseRequirements.map(requirement => new CourseRequirementDTO(requirement));
    this.course_faqs = data.courseFaqs.map(faq => new CourseFaqDTO(faq));
    this.course_progress = data.courseProgress[0] ? new CourseProgressDTO(data.courseProgress[0]) : null;
    this.achieved_skills = data.achievedSkills.map(skill => new AchievedSkillDTO(skill));
  }
}

class CourseDetailDTO {
  constructor(data) {
    this.course = data.courseDetails[0] ? new CourseDTO({
      ...data.courseDetails[0],
      instructor_name: data.courseDetails[0].instructor_name,
      instructor_dp: data.courseDetails[0].instructor_dp,
      instructor_about: data.courseDetails[0].instructor_about,
      average_rating: parseFloat(data.courseDetails[0].average_rating) || 0
    }) : null;
    this.course_sections = data.courseSections.map(section => new CourseSectionDTO(section));
    this.course_lessons = data.courseLessons.map(lesson => new CourseLessonDTO(lesson));
    this.lesson_skills = data.lessonSkills.map(skill => new LessonSkillDTO(skill));
    this.course_reviews = data.courseReviews.map(review => new CourseReviewDTO(review));
    this.course_outcomes = data.courseOutcomes.map(outcome => new CourseOutcomeDTO(outcome));
    this.course_requirements = data.courseRequirements.map(requirement => new CourseRequirementDTO(requirement));
    this.course_faqs = data.courseFaqs.map(faq => new CourseFaqDTO(faq));
  }
}

class CourseSkillDTO {
  constructor(skillData) {
    this.skill_id = skillData.skill_id;
    this.skill_name = skillData.skill_name;
    this.lesson_count = skillData.lesson_count || 0;
    this.last_achieved_date = skillData.last_achieved_date || null;
  }
}

class SkillSummaryDTO {
  constructor(summaryData) {
    this.skills = summaryData.skills.map(skill => new CourseSkillDTO(skill));
    this.total_count = summaryData.total_count;
  }
}

module.exports = {
  CourseDTO,
  CourseRatingDTO,
  CourseReviewDTO,
  CourseProgressDTO,
  SavedCourseDTO,
  CourseSectionDTO,
  ContentBasedLessonDetailsDTO,
  ILTSLessonDetailsDTO,
  CourseLessonDTO,
  LessonSkillDTO,
  CourseOutcomeDTO,
  CourseRequirementDTO,
  CourseFaqDTO,
  AchievedSkillDTO,
  EnrolledCourseDetailDTO,
  CourseDetailDTO,
  CourseSkillDTO,
  SkillSummaryDTO
};