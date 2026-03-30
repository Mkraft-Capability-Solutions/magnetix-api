const { promisePool } = require('../../config/db');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const geminiAIService = require('../gemini/gemini_ai_service');

/**
 * Generate unique slug for public URL (16-char hex)
 */
const generateSlug = () => {
  return crypto.randomBytes(8).toString('hex');
};

/**
 * Get all feedback forms for admin
 */
const getAllForms = async (filters = {}) => {
  const { status, type, search } = filters;

  let query = `
    SELECT
      ff.id, ff.uuid, ff.slug, ff.name, ff.description, ff.type, ff.status,
      ff.expiry_date, ff.max_responses, ff.one_per_browser,
      ff.collect_name, ff.collect_email, ff.created_at,
      COALESCE(u.email, ff.created_by) as created_by_name,
      (SELECT COUNT(*) FROM feedback_responses WHERE form_id = ff.id) as response_count,
      (SELECT COUNT(*) FROM feedback_questions WHERE form_id = ff.id) as question_count
    FROM feedback_forms ff
    LEFT JOIN users u ON ff.created_by = u.uuid
    WHERE ff.is_deleted = 0
  `;

  const params = [];

  if (status && status !== 'all') {
    query += ' AND ff.status = ?';
    params.push(status);
  }
  if (type && type !== 'all') {
    query += ' AND ff.type = ?';
    params.push(type);
  }
  if (search) {
    query += ' AND (ff.name LIKE ? OR ff.description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  query += ' ORDER BY ff.created_at DESC';

  const [rows] = await promisePool.query(query, params);
  return rows;
};

/**
 * Get form by ID with questions
 */
const getFormById = async (formId) => {
  // Get form details
  const [forms] = await promisePool.query(`
    SELECT * FROM feedback_forms WHERE id = ? AND is_deleted = 0
  `, [formId]);

  if (forms.length === 0) return null;

  // Get questions
  const [questions] = await promisePool.query(`
    SELECT * FROM feedback_questions
    WHERE form_id = ?
    ORDER BY question_order ASC
  `, [formId]);

  return {
    ...forms[0],
    questions
  };
};

/**
 * Get supported question types from database
 */
const getSupportedQuestionTypes = async () => {
  try {
    // Query the ENUM values from the database
    const [result] = await promisePool.query(`
      SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'lms_db' AND TABLE_NAME = 'feedback_questions'
      AND COLUMN_NAME = 'question_type'
    `);

    if (result.length > 0) {
      const columnType = result[0].COLUMN_TYPE;
      // Extract enum values from "enum('type1','type2','type3')"
      const matches = columnType.match(/'([^']*)'/g);
      if (matches) {
        return matches.map(m => m.replace(/'/g, ''));
      }
    }
  } catch (error) {
    console.error('Error getting supported question types:', error);
  }

  // Default supported types if query fails
  return ['short_text', 'paragraph', 'multiple_choice_single', 'multiple_choice_multi', 'star_rating', 'slider'];
};

/**
 * Validate questions based on form type
 */
const validateQuestions = async (formType, questions, assessmentType) => {
  if (!questions || questions.length === 0) {
    throw new Error('At least one question is required');
  }

  // Get supported question types from database
  const supportedTypes = await getSupportedQuestionTypes();

  for (const question of questions) {
    // Validate question type is supported by database
    if (!supportedTypes.includes(question.type)) {
      throw new Error(`Question type "${question.type}" is not supported. Please run the database migration to enable it.`);
    }

    // For assessment type, validate based on assessment_type
    if (formType === 'assessment') {
      if (assessmentType === 'both') {
        // Combined assessments allow both objective and subjective question types
        const allowedTypes = ['multiple_choice_single', 'multiple_choice_multi', 'short_text', 'paragraph', 'slider'].filter(t => supportedTypes.includes(t));
        if (!allowedTypes.includes(question.type)) {
          throw new Error('Assessment forms can only contain multiple choice, short text, paragraph, or slider questions');
        }
      } else if (assessmentType === 'subjective') {
        // Subjective assessments allow: short_text, paragraph, slider
        const allowedTypes = ['short_text', 'paragraph', 'slider'].filter(t => supportedTypes.includes(t));
        if (!allowedTypes.includes(question.type)) {
          throw new Error('Subjective assessment forms can only contain short text, paragraph, or slider questions');
        }
      } else {
        // Objective assessments (default) allow: multiple_choice_single, multiple_choice_multi
        if (question.type !== 'multiple_choice_single' && question.type !== 'multiple_choice_multi') {
          throw new Error('Objective assessment forms can only contain multiple choice questions');
        }
      }
    }

    // For multiple choice questions, validate options
    if (question.type === 'multiple_choice_single' || question.type === 'multiple_choice_multi') {
      if (!question.options || !Array.isArray(question.options)) {
        throw new Error('Multiple choice questions must have options');
      }

      const validOptions = question.options.filter(opt => opt && opt.trim().length > 0);
      if (validOptions.length < 2) {
        throw new Error('Multiple choice questions must have at least 2 options');
      }
    }

    // Validate score field (optional, defaults to 1)
    if (question.score !== undefined && (typeof question.score !== 'number' || question.score < 1)) {
      throw new Error('Question score must be a positive number');
    }
  }
};

/**
 * Create new feedback form with questions
 */
const createForm = async (formData, userUuid) => {
  const connection = await promisePool.getConnection();

  try {
    await connection.beginTransaction();

    // Validate questions based on form type and assessment type
    await validateQuestions(formData.type || 'feedback', formData.questions, formData.assessmentType);

    const slug = generateSlug();
    const uuid = uuidv4();

    // Check which optional columns exist
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'lms_db' AND TABLE_NAME = 'feedback_forms' AND COLUMN_NAME IN ('assessment_type', 'show_report')
    `);
    const existingCols = new Set(columns.map(c => c.COLUMN_NAME));
    const hasAssessmentType = existingCols.has('assessment_type');
    const hasShowReport = existingCols.has('show_report');

    // If show_report column doesn't exist, add it
    if (!hasShowReport) {
      try {
        await connection.query('ALTER TABLE feedback_forms ADD COLUMN show_report TINYINT(1) DEFAULT 1 AFTER show_correct_answers');
      } catch (e) { /* column may already exist from concurrent request */ }
    }

    // Ensure assessment_type column supports 'both' value
    if (hasAssessmentType && formData.assessmentType === 'both') {
      try {
        await connection.query("ALTER TABLE feedback_forms MODIFY COLUMN assessment_type VARCHAR(20) NULL");
      } catch (e) { /* ignore if already modified */ }
    }

    // Build dynamic INSERT columns
    const cols = ['uuid', 'slug', 'name', 'description', 'type'];
    const vals = [uuid, slug, formData.name, formData.description || null, formData.type || 'feedback'];
    if (hasAssessmentType) { cols.push('assessment_type'); vals.push(formData.assessmentType || null); }
    cols.push('status', 'expiry_date', 'max_responses', 'one_per_browser', 'collect_name', 'collect_email', 'show_correct_answers', 'show_report', 'created_by');
    vals.push(
      formData.status || 'draft', formData.expiryDate || null, formData.maxResponses || null,
      formData.onePerBrowser ? 1 : 0, formData.collectName ? 1 : 0, formData.collectEmail ? 1 : 0,
      formData.showCorrectAnswers !== undefined ? (formData.showCorrectAnswers ? 1 : 0) : 1,
      formData.showReport !== undefined ? (formData.showReport ? 1 : 0) : 1,
      userUuid
    );

    const queryColumns = `(${cols.join(', ')})`;
    const queryValues = `(${cols.map(() => '?').join(', ')})`;
    const insertParams = vals;

    const [formResult] = await connection.query(`
      INSERT INTO feedback_forms ${queryColumns}
      VALUES ${queryValues}
    `, insertParams);

    const formId = formResult.insertId;

    // Check which optional columns exist
    const [questionColumns] = await connection.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'lms_db' AND TABLE_NAME = 'feedback_questions'
      AND COLUMN_NAME IN ('correct_answers', 'score')
    `);
    const columnMap = {};
    questionColumns.forEach(col => {
      columnMap[col.COLUMN_NAME] = true;
    });

    // Insert questions
    if (formData.questions && formData.questions.length > 0) {
      for (let i = 0; i < formData.questions.length; i++) {
        const q = formData.questions[i];
        // Filter out empty options
        const cleanOptions = q.options ? q.options.filter(opt => opt && opt.trim().length > 0) : null;
        const correctAnswers = q.correctAnswers && q.correctAnswers.length > 0 ? JSON.stringify(q.correctAnswers) : null;

        // Build query based on available columns
        const hasCorrectAnswers = columnMap['correct_answers'];
        const hasScore = columnMap['score'];

        let queryColumns = '(form_id, question_order, question_type, question_text, is_required, options';
        let queryValues = '(?, ?, ?, ?, ?, ?';
        const insertParams = [
          formId, i + 1, q.type, q.text, q.required ? 1 : 0,
          cleanOptions ? JSON.stringify(cleanOptions) : null
        ];

        if (hasCorrectAnswers) {
          queryColumns += ', correct_answers';
          queryValues += ', ?';
          insertParams.push(correctAnswers);
        }
        if (hasScore) {
          queryColumns += ', score';
          queryValues += ', ?';
          insertParams.push(q.score || 1);
        }

        queryColumns += ')';
        queryValues += ')';

        await connection.query(`
          INSERT INTO feedback_questions ${queryColumns}
          VALUES ${queryValues}
        `, insertParams);
      }
    }

    await connection.commit();

    return {
      id: formId,
      uuid,
      slug,
      publicUrl: `/feedback/${slug}`
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

/**
 * Update existing form
 */
const updateForm = async (formId, formData) => {
  const connection = await promisePool.getConnection();

  try {
    await connection.beginTransaction();

    // Validate questions based on form type and assessment type
    if (formData.questions) {
      await validateQuestions(formData.type || 'feedback', formData.questions, formData.assessmentType);
    }

    // Update form with all fields including show_report
    const updateQuery = `UPDATE feedback_forms SET
        name = ?, description = ?, type = ?, assessment_type = ?, status = ?,
        expiry_date = ?, max_responses = ?, one_per_browser = ?,
        collect_name = ?, collect_email = ?, show_correct_answers = ?, show_report = ?
      WHERE id = ? AND is_deleted = 0`;

    const updateParams = [
      formData.name, formData.description || null, formData.type || 'feedback',
      formData.assessmentType || null, formData.status || 'draft',
      formData.expiryDate || null, formData.maxResponses || null,
      formData.onePerBrowser ? 1 : 0, formData.collectName ? 1 : 0,
      formData.collectEmail ? 1 : 0,
      formData.showCorrectAnswers !== undefined ? (formData.showCorrectAnswers ? 1 : 0) : 1,
      formData.showReport !== undefined ? (formData.showReport ? 1 : 0) : 1,
      formId
    ];

    // Update form
    await connection.query(updateQuery, updateParams);

    // Delete existing questions and re-insert
    await connection.query('DELETE FROM feedback_questions WHERE form_id = ?', [formId]);

    if (formData.questions && formData.questions.length > 0) {
      // Check which optional columns exist
      const [questionColumns] = await connection.query(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = 'lms_db' AND TABLE_NAME = 'feedback_questions'
        AND COLUMN_NAME IN ('correct_answers', 'score')
      `);
      const columnMap = {};
      questionColumns.forEach(col => {
        columnMap[col.COLUMN_NAME] = true;
      });

      for (let i = 0; i < formData.questions.length; i++) {
        const q = formData.questions[i];
        // Filter out empty options
        const cleanOptions = q.options ? q.options.filter(opt => opt && opt.trim().length > 0) : null;
        const correctAnswers = q.correctAnswers && q.correctAnswers.length > 0 ? JSON.stringify(q.correctAnswers) : null;

        // Build query based on available columns
        const hasCorrectAnswers = columnMap['correct_answers'];
        const hasScore = columnMap['score'];

        let queryColumns = '(form_id, question_order, question_type, question_text, is_required, options';
        let queryValues = '(?, ?, ?, ?, ?, ?';
        const insertParams = [
          formId, i + 1, q.type, q.text, q.required ? 1 : 0,
          cleanOptions ? JSON.stringify(cleanOptions) : null
        ];

        if (hasCorrectAnswers) {
          queryColumns += ', correct_answers';
          queryValues += ', ?';
          insertParams.push(correctAnswers);
        }
        if (hasScore) {
          queryColumns += ', score';
          queryValues += ', ?';
          insertParams.push(q.score || 1);
        }

        queryColumns += ')';
        queryValues += ')';

        await connection.query(`
          INSERT INTO feedback_questions ${queryColumns}
          VALUES ${queryValues}
        `, insertParams);
      }
    }

    await connection.commit();
    return { success: true };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

/**
 * Delete form (soft delete)
 */
const deleteForm = async (formId) => {
  await promisePool.query(
    'UPDATE feedback_forms SET is_deleted = 1 WHERE id = ?',
    [formId]
  );
  return { success: true };
};

/**
 * Get public form by slug (with validation)
 */
const getPublicFormBySlug = async (slug, browserFingerprint = null) => {
  // Get form
  const [forms] = await promisePool.query(`
    SELECT ff.*,
           (SELECT COUNT(*) FROM feedback_responses WHERE form_id = ff.id) as response_count
    FROM feedback_forms ff
    WHERE ff.slug = ? AND ff.is_deleted = 0 AND ff.status = 'active'
  `, [slug]);

  if (forms.length === 0) {
    return { error: 'FORM_NOT_FOUND', message: 'Form not found or not active' };
  }

  const form = forms[0];

  // Check expiry
  if (form.expiry_date && new Date(form.expiry_date) < new Date()) {
    return { error: 'FORM_EXPIRED', message: 'This form has expired' };
  }

  // Check max responses
  if (form.max_responses && form.response_count >= form.max_responses) {
    return { error: 'MAX_RESPONSES_REACHED', message: 'Maximum responses reached' };
  }

  // Check browser submission
  if (form.one_per_browser && browserFingerprint) {
    const [existing] = await promisePool.query(`
      SELECT id FROM feedback_responses
      WHERE form_id = ? AND browser_fingerprint = ?
    `, [form.id, browserFingerprint]);

    if (existing.length > 0) {
      return { error: 'ALREADY_SUBMITTED', message: 'You have already submitted this form' };
    }
  }

  // Get questions
  const [questions] = await promisePool.query(`
    SELECT id, question_order, question_type, question_text, is_required, options
    FROM feedback_questions
    WHERE form_id = ?
    ORDER BY question_order ASC
  `, [form.id]);

  return {
    form: {
      id: form.id,
      name: form.name,
      description: form.description,
      type: form.type,
      assessmentType: form.assessment_type || 'objective',
      collectName: form.collect_name === 1,
      collectEmail: form.collect_email === 1,
      showCorrectAnswers: form.show_correct_answers === 1,
      showReport: form.show_report === 1,
      questions: questions.map(q => ({
        ...q,
        options: q.options ? (typeof q.options === 'string' ? JSON.parse(q.options) : q.options) : null
      }))
    }
  };
};

/**
 * Calculate assessment score
 */
const calculateAssessmentScore = (questions, userAnswers) => {
  let score = 0;
  let maxScore = questions.length;

  for (const question of questions) {
    const userAnswer = userAnswers.find(a => a.questionId === question.id);
    if (!userAnswer || !question.correct_answers) continue;

    const correctAnswers = typeof question.correct_answers === 'string'
      ? JSON.parse(question.correct_answers)
      : question.correct_answers;

    if (!correctAnswers || correctAnswers.length === 0) continue;

    // Get user's selected options
    let userSelectedIndices = [];
    if (userAnswer.options) {
      const selectedOptions = typeof userAnswer.options === 'string'
        ? JSON.parse(userAnswer.options)
        : userAnswer.options;

      // Convert selected option text to indices
      if (Array.isArray(selectedOptions) && question.options) {
        const questionOptions = typeof question.options === 'string'
          ? JSON.parse(question.options)
          : question.options;

        userSelectedIndices = selectedOptions.map(selectedOpt =>
          questionOptions.findIndex(opt => opt === selectedOpt)
        ).filter(idx => idx !== -1);
      }
    }

    // Check if answer is correct
    // User must select ALL correct answers and NO incorrect answers
    const correctAnswersSet = new Set(correctAnswers.sort());
    const userAnswersSet = new Set(userSelectedIndices.sort());

    const isCorrect = correctAnswers.length === userSelectedIndices.length &&
                     correctAnswers.every(idx => userAnswersSet.has(idx)) &&
                     userSelectedIndices.every(idx => correctAnswersSet.has(idx));

    if (isCorrect) {
      score++;
    }
  }

  const percentage = maxScore > 0 ? ((score / maxScore) * 100).toFixed(2) : 0;

  return { score, maxScore, percentage };
};

/**
 * Submit response to public form
 */
const submitResponse = async (slug, responseData) => {
  // Validate form exists and is submittable
  const validation = await getPublicFormBySlug(slug, responseData.browserFingerprint);

  if (validation.error) {
    return validation;
  }

  const connection = await promisePool.getConnection();

  try {
    await connection.beginTransaction();

    const form = validation.form;

    // Get form details to check if it's an assessment
    const [formDetails] = await connection.query(
      'SELECT type, assessment_type, show_correct_answers, show_report FROM feedback_forms WHERE id = ?',
      [form.id]
    );
    const isAssessment = formDetails[0]?.type === 'assessment';
    const isSubjective = formDetails[0]?.assessment_type === 'subjective';
    const showCorrectAnswers = formDetails[0]?.show_correct_answers === 1;
    const showReport = formDetails[0]?.show_report === 1;

    // Calculate score for assessments
    let scoreData = null;
    let detailedResults = null;
    let assessmentType = formDetails[0]?.assessment_type || 'objective';
    if (isAssessment) {
      // Fetch questions with correct_answers and score for scoring
      const [questionsWithAnswers] = await connection.query(`
        SELECT id, question_order, question_type, question_text, options, correct_answers, score
        FROM feedback_questions
        WHERE form_id = ?
        ORDER BY question_order ASC
      `, [form.id]);

      if (questionsWithAnswers.length > 0) {
        // Parse options for all questions
        const parsedQuestions = questionsWithAnswers.map(q => ({
          ...q,
          options: q.options ? (typeof q.options === 'string' ? JSON.parse(q.options) : q.options) : [],
          correct_answers: q.correct_answers ? (typeof q.correct_answers === 'string' ? JSON.parse(q.correct_answers) : q.correct_answers) : [],
        }));

        if (isSubjective || assessmentType === 'both') {
          // AI scoring for subjective assessments
          const subjectiveTypes = ['short_text', 'paragraph', 'slider'];
          const questionsForAI = [];

          for (const question of parsedQuestions) {
            const userAnswer = (responseData.answers || []).find(a => a.questionId === question.id);
            if (subjectiveTypes.includes(question.question_type)) {
              let answerText = '';
              if (question.question_type === 'slider') {
                answerText = userAnswer?.text ? `Rating: ${userAnswer.text} out of 10` : (userAnswer?.rating !== undefined ? `Rating: ${userAnswer.rating} out of 10` : '(No answer)');
              } else {
                answerText = userAnswer?.text || '(No answer provided)';
              }
              questionsForAI.push({
                questionId: question.id,
                questionText: question.question_text,
                answerText,
                maxScore: question.score || 1,
              });
            }
          }

          let aiScoringResults = null;
          try {
            const aiScores = await geminiAIService.scoreSubjectiveAnswers(questionsForAI);
            aiScoringResults = {};
            let totalScore = 0;
            let totalMaxScore = 0;

            for (let i = 0; i < questionsForAI.length; i++) {
              const qId = questionsForAI[i].questionId;
              const aiResult = aiScores[i];
              aiScoringResults[qId] = {
                score: aiResult.score,
                maxScore: aiResult.maxScore,
                feedback: aiResult.feedback,
              };
              totalScore += aiResult.score;
              totalMaxScore += aiResult.maxScore;
            }

            // Also account for any objective questions in a mixed assessment
            for (const question of parsedQuestions) {
              if (!subjectiveTypes.includes(question.question_type)) {
                const qMaxScore = question.score || 1;
                totalMaxScore += qMaxScore;
                const userAnswer = (responseData.answers || []).find(a => a.questionId === question.id);
                if (userAnswer && question.correct_answers && question.correct_answers.length > 0) {
                  let userSelectedIndices = [];
                  if (userAnswer.options) {
                    const selectedOptions = typeof userAnswer.options === 'string' ? JSON.parse(userAnswer.options) : userAnswer.options;
                    if (Array.isArray(selectedOptions)) {
                      userSelectedIndices = selectedOptions.map(opt => question.options.findIndex(o => o === opt)).filter(idx => idx !== -1);
                    }
                  }
                  const correctAnswersSet = new Set(question.correct_answers);
                  const userAnswersSet = new Set(userSelectedIndices);
                  const isCorrect = question.correct_answers.length === userSelectedIndices.length &&
                    question.correct_answers.every(idx => userAnswersSet.has(idx)) &&
                    userSelectedIndices.every(idx => correctAnswersSet.has(idx));
                  if (isCorrect) totalScore += qMaxScore;
                }
              }
            }

            scoreData = {
              score: parseFloat(totalScore.toFixed(2)),
              maxScore: totalMaxScore,
              percentage: totalMaxScore > 0 ? ((totalScore / totalMaxScore) * 100).toFixed(2) : 0,
            };
          } catch (aiError) {
            console.error('AI scoring failed for public subjective assessment:', aiError.message);
            scoreData = calculateAssessmentScore(parsedQuestions, responseData.answers || []);
            aiScoringResults = { _error: 'AI scoring unavailable. Your answers will be reviewed manually.' };
          }

          // Build detailed results for all questions (subjective + objective for 'both')
          detailedResults = parsedQuestions.map(question => {
            const userAnswer = (responseData.answers || []).find(a => a.questionId === question.id);
            const isSubjectiveQ = subjectiveTypes.includes(question.question_type);

            if (isSubjectiveQ) {
              // Subjective result with AI scoring
              const aiResult = aiScoringResults && !aiScoringResults._error ? aiScoringResults[question.id] : null;

              let userAnswerText = '';
              if (question.question_type === 'slider') {
                userAnswerText = userAnswer?.text ? `${userAnswer.text}/10` : (userAnswer?.rating !== undefined ? `${userAnswer.rating}/10` : 'No answer');
              } else if (userAnswer?.text) {
                userAnswerText = userAnswer.text;
              } else {
                userAnswerText = 'No answer provided';
              }

              return {
                questionId: question.id,
                questionText: question.question_text,
                questionType: question.question_type,
                userAnswerText,
                aiScore: aiResult ? aiResult.score : null,
                aiMaxScore: aiResult ? aiResult.maxScore : (question.score || 1),
                aiFeedback: aiResult ? aiResult.feedback : (aiScoringResults?._error || null),
                isSubjective: true,
              };
            } else {
              // Objective result
              let userSelectedIndices = [];
              if (userAnswer && userAnswer.options) {
                const selectedOptions = typeof userAnswer.options === 'string' ? JSON.parse(userAnswer.options) : userAnswer.options;
                if (Array.isArray(selectedOptions)) {
                  userSelectedIndices = selectedOptions.map(opt => question.options.findIndex(o => o === opt)).filter(idx => idx !== -1);
                }
              }
              const correctAnswersSet = new Set(question.correct_answers);
              const userAnswersSet = new Set(userSelectedIndices);
              const isCorrect = question.correct_answers.length === userSelectedIndices.length &&
                question.correct_answers.every(idx => userAnswersSet.has(idx)) &&
                userSelectedIndices.every(idx => correctAnswersSet.has(idx));

              return {
                questionId: question.id,
                questionText: question.question_text,
                questionType: question.question_type,
                options: question.options,
                userSelectedIndices,
                correctIndices: question.correct_answers,
                isCorrect,
                isSubjective: false,
              };
            }
          });
        } else {
          // Objective scoring (existing logic)
          scoreData = calculateAssessmentScore(parsedQuestions, responseData.answers || []);

          // Build detailed results for each question
          detailedResults = parsedQuestions.map(question => {
            const userAnswer = (responseData.answers || []).find(a => a.questionId === question.id);

            // Get user's selected option indices
            let userSelectedIndices = [];
            if (userAnswer && userAnswer.options) {
              const selectedOptions = typeof userAnswer.options === 'string'
                ? JSON.parse(userAnswer.options)
                : userAnswer.options;

              if (Array.isArray(selectedOptions)) {
                userSelectedIndices = selectedOptions.map(selectedOpt =>
                  question.options.findIndex(opt => opt === selectedOpt)
                ).filter(idx => idx !== -1);
              }
            }

            // Check if correct
            const correctAnswersSet = new Set(question.correct_answers);
            const userAnswersSet = new Set(userSelectedIndices);
            const isCorrect = question.correct_answers.length === userSelectedIndices.length &&
                             question.correct_answers.every(idx => userAnswersSet.has(idx)) &&
                             userSelectedIndices.every(idx => correctAnswersSet.has(idx));

            return {
              questionId: question.id,
              questionText: question.question_text,
              questionType: question.question_type,
              options: question.options,
              userSelectedIndices,
              correctIndices: question.correct_answers,
              isCorrect,
              isSubjective: false,
            };
          });
        }
      }
    }

    // Insert response (frontend sends respondentName/respondentEmail)
    const [responseResult] = await connection.query(`
      INSERT INTO feedback_responses
      (form_id, browser_fingerprint, respondent_name, respondent_email, ip_address, score, max_score, percentage)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      form.id,
      responseData.browserFingerprint || null,
      responseData.respondentName || responseData.name || null,
      responseData.respondentEmail || responseData.email || null,
      responseData.ipAddress || null,
      scoreData ? scoreData.score : null,
      scoreData ? scoreData.maxScore : null,
      scoreData ? scoreData.percentage : null
    ]);

    const responseId = responseResult.insertId;

    // Insert answers
    if (responseData.answers && responseData.answers.length > 0) {
      for (const answer of responseData.answers) {
        await connection.query(`
          INSERT INTO feedback_answers
          (response_id, question_id, answer_text, answer_options, answer_rating)
          VALUES (?, ?, ?, ?, ?)
        `, [
          responseId,
          answer.questionId,
          answer.text || null,
          answer.options ? JSON.stringify(answer.options) : null,
          answer.rating || null
        ]);
      }
    }

    await connection.commit();

    return {
      success: true,
      responseId,
      ...(scoreData && {
        score: scoreData.score,
        maxScore: scoreData.maxScore,
        percentage: scoreData.percentage,
        assessmentType,
        showCorrectAnswers: (isSubjective || assessmentType === 'both') ? true : showCorrectAnswers,
        showReport,
        // For subjective/both always show results; for objective only if admin enabled
        ...((isSubjective || assessmentType === 'both' || showCorrectAnswers) && { results: detailedResults }),
        respondentName: responseData.respondentName || responseData.name || null,
        respondentEmail: responseData.respondentEmail || responseData.email || null
      })
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

/**
 * Get analytics for a form
 */
const getFormAnalytics = async (formId) => {
  // Get form type to check if it's an assessment
  const [formInfo] = await promisePool.query(
    'SELECT type FROM feedback_forms WHERE id = ?',
    [formId]
  );
  const isAssessment = formInfo[0]?.type === 'assessment';

  // Response stats
  const [stats] = await promisePool.query(`
    SELECT
      COUNT(*) as total_responses,
      COUNT(CASE WHEN submitted_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as responses_this_week,
      MIN(submitted_at) as first_response,
      MAX(submitted_at) as last_response,
      ${isAssessment ? 'AVG(percentage) as avg_score, MIN(percentage) as min_score, MAX(percentage) as max_score,' : ''}
      ${isAssessment ? 'COUNT(CASE WHEN percentage >= 60 THEN 1 END) as passed_count,' : ''}
      ${isAssessment ? 'COUNT(CASE WHEN percentage < 60 THEN 1 END) as failed_count' : 'NULL as avg_score, NULL as min_score, NULL as max_score, NULL as passed_count, NULL as failed_count'}
    FROM feedback_responses
    WHERE form_id = ?
  `, [formId]);

  // Rating distribution (for star rating questions)
  const [ratingDist] = await promisePool.query(`
    SELECT
      fa.answer_rating as stars,
      COUNT(*) as count
    FROM feedback_answers fa
    JOIN feedback_questions fq ON fa.question_id = fq.id
    WHERE fq.form_id = ? AND fq.question_type = 'star_rating' AND fa.answer_rating IS NOT NULL
    GROUP BY fa.answer_rating
    ORDER BY fa.answer_rating DESC
  `, [formId]);

  // Calculate total for percentages
  const totalRatings = ratingDist.reduce((sum, r) => sum + r.count, 0);
  const ratingDistribution = ratingDist.map(r => ({
    stars: r.stars,
    count: r.count,
    percentage: totalRatings > 0 ? Math.round((r.count / totalRatings) * 100) : 0
  }));

  // Average rating per question
  const [avgRatings] = await promisePool.query(`
    SELECT
      fq.id as question_id,
      fq.question_text,
      ROUND(AVG(fa.answer_rating), 1) as avg_rating,
      COUNT(fa.answer_rating) as rating_count
    FROM feedback_questions fq
    LEFT JOIN feedback_answers fa ON fq.id = fa.question_id AND fa.answer_rating IS NOT NULL
    WHERE fq.form_id = ? AND fq.question_type = 'star_rating'
    GROUP BY fq.id, fq.question_text
    ORDER BY fq.question_order
  `, [formId]);

  // Recent responses
  const [recentResponses] = await promisePool.query(`
    SELECT
      fr.id,
      fr.respondent_name,
      fr.respondent_email,
      fr.submitted_at,
      (SELECT answer_rating FROM feedback_answers fa
       JOIN feedback_questions fq ON fa.question_id = fq.id
       WHERE fa.response_id = fr.id AND fq.question_type = 'star_rating'
       LIMIT 1) as first_rating,
      (SELECT answer_text FROM feedback_answers fa
       JOIN feedback_questions fq ON fa.question_id = fq.id
       WHERE fa.response_id = fr.id AND fq.question_type IN ('short_text', 'paragraph') AND fa.answer_text IS NOT NULL
       LIMIT 1) as first_comment
    FROM feedback_responses fr
    WHERE fr.form_id = ?
    ORDER BY fr.submitted_at DESC
    LIMIT 10
  `, [formId]);

  // Calculate completion rate and average rating
  const avgRating = avgRatings.length > 0
    ? (avgRatings.reduce((sum, q) => sum + (parseFloat(q.avg_rating) || 0), 0) / avgRatings.length).toFixed(1)
    : 0;

  return {
    stats: {
      ...stats[0],
      avg_rating: avgRating,
      completion_rate: 100 // Placeholder - would need to track partial submissions
    },
    ratingDistribution,
    avgRatingsByQuestion: avgRatings,
    recentResponses
  };
};

/**
 * Get paginated responses for a form with search
 */
const getFormResponsesPaginated = async (formId, page = 1, limit = 20, search = '') => {
  const offset = (page - 1) * limit;

  // Get form type to check if it's an assessment
  const [formInfo] = await promisePool.query(
    'SELECT type FROM feedback_forms WHERE id = ?',
    [formId]
  );
  const isAssessment = formInfo[0]?.type === 'assessment';

  // Build search condition
  let searchCondition = '';
  const params = [formId];

  if (search) {
    searchCondition = ' AND (fr.respondent_name LIKE ? OR fr.respondent_email LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  // Get total count
  const [countResult] = await promisePool.query(`
    SELECT COUNT(*) as total
    FROM feedback_responses fr
    WHERE fr.form_id = ?${searchCondition}
  `, params);

  const total = countResult[0].total;

  // Get paginated responses
  const [responses] = await promisePool.query(`
    SELECT
      fr.id,
      fr.respondent_name,
      fr.respondent_email,
      fr.submitted_at,
      ${isAssessment ? 'fr.percentage,' : 'NULL as percentage,'}
      ${isAssessment ? 'fr.score,' : 'NULL as score,'}
      ${isAssessment ? 'fr.max_score' : 'NULL as max_score'}
    FROM feedback_responses fr
    WHERE fr.form_id = ?${searchCondition}
    ORDER BY fr.submitted_at DESC
    LIMIT ? OFFSET ?
  `, [...params, limit, offset]);

  return {
    responses,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    },
    isAssessment
  };
};

/**
 * Get all responses for a form (for export)
 */
const getFormResponses = async (formId) => {
  const [responses] = await promisePool.query(`
    SELECT
      fr.id, fr.respondent_name, fr.respondent_email, fr.submitted_at,
      fq.question_text, fq.question_type,
      fa.answer_text, fa.answer_options, fa.answer_rating
    FROM feedback_responses fr
    JOIN feedback_answers fa ON fr.id = fa.response_id
    JOIN feedback_questions fq ON fa.question_id = fq.id
    WHERE fr.form_id = ?
    ORDER BY fr.submitted_at DESC, fq.question_order ASC
  `, [formId]);

  return responses;
};

/**
 * Get detailed response by ID with questions and answers
 */
const getResponseById = async (responseId) => {
  // Get response basic info
  const [responses] = await promisePool.query(`
    SELECT
      fr.id,
      fr.form_id,
      fr.respondent_name,
      fr.respondent_email,
      fr.submitted_at,
      fr.score,
      fr.max_score,
      fr.percentage,
      ff.name as form_name,
      ff.type as form_type
    FROM feedback_responses fr
    JOIN feedback_forms ff ON fr.form_id = ff.id
    WHERE fr.id = ?
  `, [responseId]);

  if (responses.length === 0) {
    return null;
  }

  const response = responses[0];
  const isAssessment = response.form_type === 'assessment';

  // Check which optional columns exist on feedback_questions
  const [qScoreCol] = await promisePool.query(`
    SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'lms_db' AND TABLE_NAME = 'feedback_questions' AND COLUMN_NAME = 'score'
  `);
  const hasQuestionScore = qScoreCol.length > 0;

  // Get all questions for this form with answers
  const [questionsWithAnswers] = await promisePool.query(`
    SELECT
      fq.id as question_id,
      fq.question_order,
      fq.question_type,
      fq.question_text,
      fq.options,
      fq.correct_answers,
      fq.is_required,
      ${hasQuestionScore ? 'fq.score as question_score,' : ''}
      fa.id as answer_id,
      fa.answer_text,
      fa.answer_options,
      fa.answer_rating
    FROM feedback_questions fq
    LEFT JOIN feedback_answers fa ON fq.id = fa.question_id AND fa.response_id = ?
    WHERE fq.form_id = ?
    ORDER BY fq.question_order ASC
  `, [responseId, response.form_id]);

  // Process questions and answers
  const questionsAndAnswers = questionsWithAnswers.map(q => {
    const questionData = {
      questionId: q.question_id,
      questionOrder: q.question_order,
      questionType: q.question_type,
      questionText: q.question_text,
      isRequired: q.is_required === 1,
      options: q.options ? (typeof q.options === 'string' ? JSON.parse(q.options) : q.options) : null,
      answerId: q.answer_id || null,
      answerText: q.answer_text,
      answerOptions: q.answer_options ? (typeof q.answer_options === 'string' ? JSON.parse(q.answer_options) : q.answer_options) : null,
      answerRating: q.answer_rating,
      questionMaxScore: q.question_score || 1
    };

    // For assessments, add correct/incorrect info
    if (isAssessment && (q.question_type === 'multiple_choice_single' || q.question_type === 'multiple_choice_multi')) {
      const correctAnswers = q.correct_answers
        ? (typeof q.correct_answers === 'string' ? JSON.parse(q.correct_answers) : q.correct_answers)
        : [];

      // Get user's selected indices
      let userSelectedIndices = [];
      if (q.answer_options) {
        const selectedOptions = typeof q.answer_options === 'string'
          ? JSON.parse(q.answer_options)
          : q.answer_options;

        if (Array.isArray(selectedOptions) && questionData.options) {
          userSelectedIndices = selectedOptions.map(selectedOpt =>
            questionData.options.findIndex(opt => opt === selectedOpt)
          ).filter(idx => idx !== -1);
        }
      }

      // Check if correct
      const correctAnswersSet = new Set(correctAnswers);
      const userAnswersSet = new Set(userSelectedIndices);
      const isCorrect = correctAnswers.length === userSelectedIndices.length &&
                       correctAnswers.every(idx => userAnswersSet.has(idx)) &&
                       userSelectedIndices.every(idx => correctAnswersSet.has(idx));

      questionData.correctAnswers = correctAnswers;
      questionData.userSelectedIndices = userSelectedIndices;
      questionData.isCorrect = isCorrect;
    }

    return questionData;
  });

  return {
    id: response.id,
    formId: response.form_id,
    formName: response.form_name,
    formType: response.form_type,
    respondentName: response.respondent_name,
    respondentEmail: response.respondent_email,
    submittedAt: response.submitted_at,
    score: response.score,
    maxScore: response.max_score,
    percentage: response.percentage,
    questionsAndAnswers
  };
};

/**
 * Get all submissions across all forms with optional filters
 */
const getAllSubmissions = async (page = 1, limit = 20, formType, assessmentType, search = '') => {
  const offset = (page - 1) * limit;
  const params = [];
  let whereCondition = 'WHERE 1=1';

  // Add form type filter
  if (formType) {
    whereCondition += ' AND ff.type = ?';
    params.push(formType);
  }

  // Add assessment type filter (only if column exists and assessmentType is provided)
  // Note: assessment_type column is added via migration, may not exist yet
  if (assessmentType) {
    // Check if assessment_type column exists before using it
    const [columns] = await promisePool.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'feedback_forms' AND COLUMN_NAME = 'assessment_type'
    `);

    if (columns.length > 0) {
      whereCondition += ' AND ff.assessment_type = ?';
      params.push(assessmentType);
    }
  }

  // Add search filter
  if (search) {
    whereCondition += ' AND (fr.respondent_name LIKE ? OR fr.respondent_email LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  // Get total count
  const [countResult] = await promisePool.query(`
    SELECT COUNT(*) as total
    FROM feedback_responses fr
    JOIN feedback_forms ff ON fr.form_id = ff.id
    ${whereCondition}
  `, params);

  const total = countResult[0].total;

  // Check which columns exist (may not exist if migrations haven't been run)
  const [existingColumns] = await promisePool.query(`
    SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'lms_db' AND (
      (TABLE_NAME = 'feedback_forms' AND COLUMN_NAME = 'assessment_type') OR
      (TABLE_NAME = 'feedback_responses' AND COLUMN_NAME IN ('score', 'max_score', 'percentage'))
    )
  `);

  const columnMap = {};
  existingColumns.forEach(col => {
    columnMap[col.COLUMN_NAME] = true;
  });

  const hasAssessmentType = columnMap['assessment_type'];
  const hasScore = columnMap['score'];
  const hasMaxScore = columnMap['max_score'];
  const hasPercentage = columnMap['percentage'];

  // Get paginated submissions
  const [submissions] = await promisePool.query(`
    SELECT
      fr.id,
      fr.form_id,
      ff.name as form_name,
      ff.type as form_type,
      ${hasAssessmentType ? 'ff.assessment_type' : 'NULL as assessment_type'},
      fr.respondent_name,
      fr.respondent_email,
      fr.submitted_at,
      ${hasScore ? 'fr.score' : 'NULL as score'},
      ${hasMaxScore ? 'fr.max_score' : 'NULL as max_score'},
      ${hasPercentage ? 'fr.percentage' : 'NULL as percentage'}
    FROM feedback_responses fr
    JOIN feedback_forms ff ON fr.form_id = ff.id
    ${whereCondition}
    ORDER BY fr.submitted_at DESC
    LIMIT ? OFFSET ?
  `, [...params, limit, offset]);

  return {
    submissions,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
};

/**
 * AI score a subjective assessment response
 */
const aiScoreResponse = async (responseId) => {
  const geminiAIService = require('../gemini/gemini_ai_service');

  // Get response with form info
  const [responses] = await promisePool.query(`
    SELECT fr.id, fr.form_id, ff.type, ff.assessment_type
    FROM feedback_responses fr
    JOIN feedback_forms ff ON fr.form_id = ff.id
    WHERE fr.id = ?
  `, [responseId]);

  if (responses.length === 0) {
    throw new Error('Response not found');
  }

  const response = responses[0];
  if (response.type !== 'assessment' || response.assessment_type !== 'subjective') {
    throw new Error('AI scoring is only available for subjective assessments');
  }

  // Get questions and answers
  const [questionsAndAnswers] = await promisePool.query(`
    SELECT
      fq.id as question_id,
      fq.question_text,
      fq.question_type,
      fq.score as max_score,
      fa.id as answer_id,
      fa.answer_text,
      fa.answer_rating
    FROM feedback_questions fq
    LEFT JOIN feedback_answers fa ON fq.id = fa.question_id AND fa.response_id = ?
    WHERE fq.form_id = ?
    ORDER BY fq.question_order ASC
  `, [responseId, response.form_id]);

  // Prepare data for AI scoring
  const questionsForAI = questionsAndAnswers.map(qa => ({
    questionText: qa.question_text,
    answerText: qa.answer_text || (qa.answer_rating ? String(qa.answer_rating) : null),
    maxScore: qa.max_score || 1
  }));

  // Call AI scoring
  const aiScores = await geminiAIService.scoreSubjectiveAnswers(questionsForAI);

  // Check if scoring columns exist
  const [scoringColumns] = await promisePool.query(`
    SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'lms_db' AND TABLE_NAME = 'feedback_answers'
    AND COLUMN_NAME IN ('ai_score', 'manual_score', 'max_score', 'ai_feedback')
  `);
  const columnMap = {};
  scoringColumns.forEach(col => { columnMap[col.COLUMN_NAME] = true; });

  const hasAiScore = columnMap['ai_score'];
  const hasMaxScore = columnMap['max_score'];
  const hasAiFeedback = columnMap['ai_feedback'];

  if (!hasAiScore) {
    throw new Error('Scoring columns not found. Please run the add_subjective_scoring migration.');
  }

  // Update each answer with AI scores
  const connection = await promisePool.getConnection();
  try {
    await connection.beginTransaction();

    let totalScore = 0;
    let totalMaxScore = 0;

    for (let i = 0; i < questionsAndAnswers.length; i++) {
      const qa = questionsAndAnswers[i];
      const aiResult = aiScores[i];

      if (qa.answer_id) {
        let updateQuery = 'UPDATE feedback_answers SET ai_score = ?';
        const updateParams = [aiResult.score];

        if (hasMaxScore) {
          updateQuery += ', max_score = ?';
          updateParams.push(aiResult.maxScore);
        }
        if (hasAiFeedback) {
          updateQuery += ', ai_feedback = ?';
          updateParams.push(aiResult.feedback);
        }

        updateQuery += ' WHERE id = ?';
        updateParams.push(qa.answer_id);

        await connection.query(updateQuery, updateParams);
      }

      totalScore += aiResult.score;
      totalMaxScore += aiResult.maxScore;
    }

    // Update overall response score
    const percentage = totalMaxScore > 0 ? ((totalScore / totalMaxScore) * 100).toFixed(2) : 0;
    await connection.query(
      'UPDATE feedback_responses SET score = ?, max_score = ?, percentage = ? WHERE id = ?',
      [totalScore, totalMaxScore, percentage, responseId]
    );

    await connection.commit();

    return {
      success: true,
      totalScore,
      totalMaxScore,
      percentage: parseFloat(percentage),
      scores: questionsAndAnswers.map((qa, i) => ({
        questionId: qa.question_id,
        questionText: qa.question_text,
        answerText: qa.answer_text,
        aiScore: aiScores[i].score,
        maxScore: aiScores[i].maxScore,
        feedback: aiScores[i].feedback
      }))
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

/**
 * Update manual scores for a subjective assessment response
 */
const updateManualScores = async (responseId, scores) => {
  // Validate response exists and is subjective
  const [responses] = await promisePool.query(`
    SELECT fr.id, fr.form_id, ff.type, ff.assessment_type
    FROM feedback_responses fr
    JOIN feedback_forms ff ON fr.form_id = ff.id
    WHERE fr.id = ?
  `, [responseId]);

  if (responses.length === 0) {
    throw new Error('Response not found');
  }

  const response = responses[0];
  if (response.type !== 'assessment' || response.assessment_type !== 'subjective') {
    throw new Error('Manual scoring is only available for subjective assessments');
  }

  // Check if manual_score column exists
  const [scoringColumns] = await promisePool.query(`
    SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'lms_db' AND TABLE_NAME = 'feedback_answers'
    AND COLUMN_NAME = 'manual_score'
  `);

  if (scoringColumns.length === 0) {
    throw new Error('Scoring columns not found. Please run the add_subjective_scoring migration.');
  }

  const connection = await promisePool.getConnection();
  try {
    await connection.beginTransaction();

    let totalScore = 0;
    let totalMaxScore = 0;

    for (const scoreEntry of scores) {
      const { answerId, score, maxScore } = scoreEntry;

      // Update the manual score for each answer
      await connection.query(
        'UPDATE feedback_answers SET manual_score = ? WHERE id = ? AND response_id = ?',
        [score, answerId, responseId]
      );

      totalScore += score;
      totalMaxScore += maxScore || 1;
    }

    // Update overall response score using manual scores
    const percentage = totalMaxScore > 0 ? ((totalScore / totalMaxScore) * 100).toFixed(2) : 0;
    await connection.query(
      'UPDATE feedback_responses SET score = ?, max_score = ?, percentage = ? WHERE id = ?',
      [totalScore, totalMaxScore, percentage, responseId]
    );

    await connection.commit();

    return {
      success: true,
      totalScore,
      totalMaxScore,
      percentage: parseFloat(percentage)
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

/**
 * Get detailed response by ID with scoring data (extended for subjective)
 */
const getResponseByIdWithScoring = async (responseId) => {
  const baseResponse = await getResponseById(responseId);
  if (!baseResponse) return null;

  // Get form assessment type (safely handle missing column)
  try {
    const [atColumns] = await promisePool.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'lms_db' AND TABLE_NAME = 'feedback_forms' AND COLUMN_NAME = 'assessment_type'
    `);

    if (atColumns.length > 0) {
      const [formInfo] = await promisePool.query(
        'SELECT assessment_type FROM feedback_forms WHERE id = ?',
        [baseResponse.formId]
      );
      baseResponse.assessmentType = formInfo[0]?.assessment_type || null;
    } else {
      baseResponse.assessmentType = null;
    }
  } catch (e) {
    baseResponse.assessmentType = null;
  }

  // Check if scoring columns exist on feedback_answers
  const [scoringColumns] = await promisePool.query(`
    SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'lms_db' AND TABLE_NAME = 'feedback_answers'
    AND COLUMN_NAME IN ('ai_score', 'manual_score', 'max_score', 'ai_feedback')
  `);
  const columnMap = {};
  scoringColumns.forEach(col => { columnMap[col.COLUMN_NAME] = true; });

  const hasAiScore = columnMap['ai_score'];
  const hasManualScore = columnMap['manual_score'];
  const hasAnswerMaxScore = columnMap['max_score'];
  const hasAiFeedback = columnMap['ai_feedback'];

  // Fetch scoring data for answers (always fetch answer_id; scoring cols only if they exist)
  const selectCols = [
    'fa.question_id',
    'fa.id as answer_id',
    hasAiScore ? 'fa.ai_score' : 'NULL as ai_score',
    hasManualScore ? 'fa.manual_score' : 'NULL as manual_score',
    hasAnswerMaxScore ? 'fa.max_score' : 'NULL as max_score',
    hasAiFeedback ? 'fa.ai_feedback' : 'NULL as ai_feedback'
  ].join(', ');

  const [scoringData] = await promisePool.query(`
    SELECT ${selectCols}
    FROM feedback_answers fa
    WHERE fa.response_id = ?
  `, [responseId]);

  // Merge scoring data into questionsAndAnswers
  const scoringMap = {};
  scoringData.forEach(s => {
    scoringMap[s.question_id] = {
      answerId: s.answer_id,
      aiScore: s.ai_score !== null && s.ai_score !== undefined ? parseFloat(s.ai_score) : null,
      manualScore: s.manual_score !== null && s.manual_score !== undefined ? parseFloat(s.manual_score) : null,
      aiFeedback: s.ai_feedback || null
    };
    // Only override questionMaxScore from answer table if it has a value
    if (s.max_score !== null && s.max_score !== undefined) {
      scoringMap[s.question_id].questionMaxScore = parseFloat(s.max_score);
    }
  });

  baseResponse.questionsAndAnswers = baseResponse.questionsAndAnswers.map(qa => {
    const scoring = scoringMap[qa.questionId] || {};
    return {
      ...qa,
      // answerId from scoring query overrides the base one (should be the same)
      answerId: scoring.answerId || qa.answerId,
      aiScore: scoring.aiScore !== undefined ? scoring.aiScore : null,
      manualScore: scoring.manualScore !== undefined ? scoring.manualScore : null,
      aiFeedback: scoring.aiFeedback || null,
      // Use answer-level max_score if set (from AI scoring), else keep question-level score
      questionMaxScore: scoring.questionMaxScore || qa.questionMaxScore || 1
    };
  });

  return baseResponse;
};

module.exports = {
  getAllForms,
  getFormById,
  createForm,
  updateForm,
  deleteForm,
  getPublicFormBySlug,
  submitResponse,
  getFormAnalytics,
  getFormResponses,
  getFormResponsesPaginated,
  getResponseById,
  getAllSubmissions,
  aiScoreResponse,
  updateManualScores,
  getResponseByIdWithScoring,
  calculateAssessmentScore
};
