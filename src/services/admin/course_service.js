const { promisePool } = require("../../config/db");
const { v4: uuidv4 } = require("uuid");
const crypto = require("crypto");
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

class AdminCourseService {
  async getAllCourses() {
    const [rows] = await promisePool.query("SELECT * FROM course");
    return rows;
  }

  async getCourseById(courseId) {
    const [rows] = await promisePool.query(
      "SELECT * FROM course WHERE id = ?",
      [courseId]
    );
    if (rows.length === 0) {
      throw new Error("Course not found");
    }
    return rows[0];
  }

  async createCourse(data) {
    const { title, description, instructorId } = data;

    if (!title || !description || !instructorId) {
      throw new Error("Title, description, and instructor ID are required");
    }

    const courseId = uuidv4();

    await promisePool.query(
      `INSERT INTO course (id, title, description, instructor_id)
       VALUES (?, ?, ?, ?)`,
      [courseId, title, description, instructorId]
    );

    return courseId;
  }

  async updateCourse(courseId, data) {
    const { title, description } = data;

    await promisePool.query(
      `UPDATE course SET title = ?, description = ?
       WHERE id = ?`,
      [title, description, courseId]
    );

    return true;
  }

  // async deleteCourse(courseId) {
  //   await promisePool.query("DELETE FROM course WHERE id = ?", [courseId]);
  //   return true;
  // }


async approveCourse(courseId) {
    const [result] = await promisePool.query(
      "UPDATE course SET status = 'active' WHERE id = ?",
      [courseId]
    );        
    if (result.affectedRows === 0) {
      throw new Error("Course not found or already approved");
    }
    return true;
  } 

  async rejectCourse(courseId) {
    const [result] = await promisePool.query(
      "UPDATE course SET status = 'inactive' WHERE id = ?",
      [courseId]
    );        
    if (result.affectedRows === 0) {
      throw new Error("Course not found or already rejected");
    }
    return true;
  }   

async deleteCourse(courseId) {
  const [result] = await promisePool.query(
    "UPDATE course SET is_deleted = 1, status = 'inactive' WHERE id = ?",
    [courseId]
  );

  if (result.affectedRows === 0) {
    throw new Error("Course not found or already deleted");
  }

  return true;
} 


  async getCourseDetails(courseId) {
  try {
    // Get course basic information
    const [courseRows] = await promisePool.query(
      `SELECT 
        c.*,
        u.email as instructor_email
       FROM course c
       LEFT JOIN users u ON c.creator_id = u.uuid
       WHERE c.id = ? AND c.is_deleted = 0`,
      [courseId]
    );

    if (courseRows.length === 0) {
      throw new Error("Course not found");
    }

    const course = courseRows[0];

    // Get instructor details from instructors table
    const [instructorRows] = await promisePool.query(
      `SELECT 
        i.first_name,
        i.last_name,
        i.contact,
        i.dp
       FROM instructors i
       WHERE i.user_id = ?`,
      [course.creator_id]
    );

    // Add instructor details to course object
    if (instructorRows.length > 0) {
      course.instructor_first_name = instructorRows[0].first_name;
      course.instructor_last_name = instructorRows[0].last_name;
      course.instructor_contact = instructorRows[0].contact;
      course.instructor_profile_picture = instructorRows[0].dp;
    } else {
      // Fallback to user email if no instructor profile exists
      course.instructor_first_name = "Instructor";
      course.instructor_last_name = "";
      course.instructor_contact = null;
      course.instructor_profile_picture = null;
    }

    // Get course sections
    const [sections] = await promisePool.query(
      `SELECT * FROM course_section WHERE course_id = ? ORDER BY id`,
      [courseId]
    );

    // Get course lessons
    const [lessons] = await promisePool.query(
      `SELECT 
        cl.*,
        cs.title as section_title
       FROM course_lesson cl
       LEFT JOIN course_section cs ON cl.section_id = cs.id
       WHERE cl.course_id = ? 
       ORDER BY cl.id`,
      [courseId]
    );

    // Get ILTS data (if this table exists)
    let ilts = [];
    try {
      const [iltsRows] = await promisePool.query(
        `SELECT * FROM ilts WHERE course_id = ?`,
        [courseId]
      );
      ilts = iltsRows;
    } catch (error) {
      console.warn("ILTS table not found or error fetching ILTS data:", error.message);
    }

    // Get course requirements (if this table exists)
    let requirements = [];
    try {
      const [requirementsRows] = await promisePool.query(
        `SELECT * FROM course_requirements WHERE course_id = ? ORDER BY requirement_id`,
        [courseId]
      );
      requirements = requirementsRows;
    } catch (error) {
      console.warn("Course requirements table not found:", error.message);
    }

    // Get course outcomes (if this table exists)
    let outcomes = [];
    try {
      const [outcomesRows] = await promisePool.query(
        `SELECT * FROM course_outcomes WHERE course_id = ? ORDER BY id`,
        [courseId]
      );
      outcomes = outcomesRows;
    } catch (error) {
      console.warn("Course outcomes table not found:", error.message);
    }

    // Get course FAQs (if this table exists)
    let faqs = [];
    try {
      const [faqsRows] = await promisePool.query(
        `SELECT * FROM course_faq WHERE course_id = ? ORDER BY id`,
        [courseId]
      );
      faqs = faqsRows;
    } catch (error) {
      console.warn("Course FAQs table not found:", error.message);
    }

    // Get lesson skills (if this table exists)
    const lessonIds = lessons.map(lesson => lesson.id);
    let lessonSkills = [];
    if (lessonIds.length > 0) {
      try {
        const [skillsRows] = await promisePool.query(
          `SELECT 
            ls.*,
            s.name as skill_name,
            s.description as skill_description
           FROM lesson_skills ls
           LEFT JOIN skills s ON ls.skill_id = s.id
           WHERE ls.lesson_id IN (?)`,
          [lessonIds]
        );
        lessonSkills = skillsRows;
      } catch (error) {
        console.warn("Lesson skills table not found:", error.message);
      }
    }

    // FIXED: Enrollment count - check if enrol table has status column
    let enrollmentCount = [{ count: 0 }];
    try {
      // First try with status check
      const [countRows] = await promisePool.query(
        `SELECT COUNT(*) as count 
         FROM enrol 
         WHERE course_id = ? AND status = 'enrolled'`,
        [courseId]
      );
      enrollmentCount = countRows;
    } catch (error) {
      if (error.message.includes('status')) {
        // If status column doesn't exist, try without it
        const [countRows] = await promisePool.query(
          `SELECT COUNT(*) as count 
           FROM enrol 
           WHERE course_id = ?`,
          [courseId]
        );
        enrollmentCount = countRows;
      } else {
        throw error;
      }
    }

   // Get only enrol table data
let enrolledStudents = [];
try {
  const [studentsRows] = await promisePool.query(
    `SELECT e.*, s.first_name, s.last_name, s.dp, s.about
     FROM enrol e
     LEFT JOIN students s ON e.user_id = s.user_id
     WHERE e.course_id = ?
     ORDER BY e.enrolled_date DESC`,
    [courseId]
  );
  enrolledStudents = studentsRows;
} catch (error) {
  console.warn("Error fetching enrol and students table data:", error.message);
}


    // Structure the response
    const structuredSections = sections.map(section => {
      const sectionLessons = lessons.filter(
        lesson => lesson.section_id === section.id
      );
      return {
        ...section,
        lessons: sectionLessons.map(lesson => {
          const skills = lessonSkills.filter(skill => skill.lesson_id === lesson.id);
          return {
            ...lesson,
            skills: skills
          };
        })
      };
    });

    return {
      course: course,
      sections: structuredSections,
      ilts: ilts[0] || null,
      requirements: requirements,
      outcomes: outcomes,
      faqs: faqs,
      enrollment_count: enrollmentCount[0]?.count || 0,
      enrolled_students: enrolledStudents
    };

  } catch (error) {
    throw new Error(`Failed to get course details: ${error.message}`);
  }
}

}

module.exports = new AdminCourseService();