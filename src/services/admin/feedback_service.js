const { promisePool } = require('../../config/db');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

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
 * Validate questions based on form type
 */
const validateQuestions = (formType, questions) => {
  if (!questions || questions.length === 0) {
    throw new Error('At least one question is required');
  }

  for (const question of questions) {
    // For assessment type, only allow multiple choice questions
    if (formType === 'assessment') {
      if (question.type !== 'multiple_choice_single' && question.type !== 'multiple_choice_multi') {
        throw new Error('Assessment forms can only contain multiple choice questions');
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
  }
};

/**
 * Create new feedback form with questions
 */
const createForm = async (formData, userUuid) => {
  const connection = await promisePool.getConnection();

  try {
    await connection.beginTransaction();

    // Validate questions based on form type
    validateQuestions(formData.type || 'feedback', formData.questions);

    const slug = generateSlug();
    const uuid = uuidv4();

    // Insert form
    const [formResult] = await connection.query(`
      INSERT INTO feedback_forms
      (uuid, slug, name, description, type, status, expiry_date, max_responses,
       one_per_browser, collect_name, collect_email, show_correct_answers, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      uuid,
      slug,
      formData.name,
      formData.description || null,
      formData.type || 'feedback',
      formData.status || 'draft',
      formData.expiryDate || null,
      formData.maxResponses || null,
      formData.onePerBrowser ? 1 : 0,
      formData.collectName ? 1 : 0,
      formData.collectEmail ? 1 : 0,
      formData.showCorrectAnswers !== undefined ? (formData.showCorrectAnswers ? 1 : 0) : 1,
      userUuid
    ]);

    const formId = formResult.insertId;

    // Insert questions
    if (formData.questions && formData.questions.length > 0) {
      for (let i = 0; i < formData.questions.length; i++) {
        const q = formData.questions[i];
        // Filter out empty options
        const cleanOptions = q.options ? q.options.filter(opt => opt && opt.trim().length > 0) : null;
        const correctAnswers = q.correctAnswers && q.correctAnswers.length > 0 ? JSON.stringify(q.correctAnswers) : null;

        await connection.query(`
          INSERT INTO feedback_questions
          (form_id, question_order, question_type, question_text, is_required, options, correct_answers)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
          formId,
          i + 1,
          q.type,
          q.text,
          q.required ? 1 : 0,
          cleanOptions ? JSON.stringify(cleanOptions) : null,
          correctAnswers
        ]);
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

    // Validate questions based on form type
    if (formData.questions) {
      validateQuestions(formData.type || 'feedback', formData.questions);
    }

    // Update form
    await connection.query(`
      UPDATE feedback_forms SET
        name = ?, description = ?, type = ?, status = ?,
        expiry_date = ?, max_responses = ?, one_per_browser = ?,
        collect_name = ?, collect_email = ?, show_correct_answers = ?
      WHERE id = ? AND is_deleted = 0
    `, [
      formData.name,
      formData.description || null,
      formData.type || 'feedback',
      formData.status || 'draft',
      formData.expiryDate || null,
      formData.maxResponses || null,
      formData.onePerBrowser ? 1 : 0,
      formData.collectName ? 1 : 0,
      formData.collectEmail ? 1 : 0,
      formData.showCorrectAnswers !== undefined ? (formData.showCorrectAnswers ? 1 : 0) : 1,
      formId
    ]);

    // Delete existing questions and re-insert
    await connection.query('DELETE FROM feedback_questions WHERE form_id = ?', [formId]);

    if (formData.questions && formData.questions.length > 0) {
      for (let i = 0; i < formData.questions.length; i++) {
        const q = formData.questions[i];
        // Filter out empty options
        const cleanOptions = q.options ? q.options.filter(opt => opt && opt.trim().length > 0) : null;
        const correctAnswers = q.correctAnswers && q.correctAnswers.length > 0 ? JSON.stringify(q.correctAnswers) : null;

        await connection.query(`
          INSERT INTO feedback_questions
          (form_id, question_order, question_type, question_text, is_required, options, correct_answers)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
          formId,
          i + 1,
          q.type,
          q.text,
          q.required ? 1 : 0,
          cleanOptions ? JSON.stringify(cleanOptions) : null,
          correctAnswers
        ]);
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
      collectName: form.collect_name === 1,
      collectEmail: form.collect_email === 1,
      showCorrectAnswers: form.show_correct_answers === 1,
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
      'SELECT type, show_correct_answers FROM feedback_forms WHERE id = ?',
      [form.id]
    );
    const isAssessment = formDetails[0]?.type === 'assessment';
    const showCorrectAnswers = formDetails[0]?.show_correct_answers === 1;

    // Calculate score for assessments
    let scoreData = null;
    let detailedResults = null;
    if (isAssessment) {
      // Fetch questions with correct_answers for scoring (not included in public form response)
      const [questionsWithAnswers] = await connection.query(`
        SELECT id, question_order, question_type, question_text, options, correct_answers
        FROM feedback_questions
        WHERE form_id = ?
        ORDER BY question_order ASC
      `, [form.id]);

      if (questionsWithAnswers.length > 0) {
        scoreData = calculateAssessmentScore(questionsWithAnswers, responseData.answers || []);

        // Build detailed results for each question
        detailedResults = questionsWithAnswers.map(question => {
          const userAnswer = (responseData.answers || []).find(a => a.questionId === question.id);

          // Parse correct answers
          const correctAnswers = question.correct_answers
            ? (typeof question.correct_answers === 'string'
                ? JSON.parse(question.correct_answers)
                : question.correct_answers)
            : [];

          // Parse question options
          const questionOptions = question.options
            ? (typeof question.options === 'string'
                ? JSON.parse(question.options)
                : question.options)
            : [];

          // Get user's selected option indices
          let userSelectedIndices = [];
          if (userAnswer && userAnswer.options) {
            const selectedOptions = typeof userAnswer.options === 'string'
              ? JSON.parse(userAnswer.options)
              : userAnswer.options;

            if (Array.isArray(selectedOptions)) {
              userSelectedIndices = selectedOptions.map(selectedOpt =>
                questionOptions.findIndex(opt => opt === selectedOpt)
              ).filter(idx => idx !== -1);
            }
          }

          // Check if correct
          const correctAnswersSet = new Set(correctAnswers);
          const userAnswersSet = new Set(userSelectedIndices);
          const isCorrect = correctAnswers.length === userSelectedIndices.length &&
                           correctAnswers.every(idx => userAnswersSet.has(idx)) &&
                           userSelectedIndices.every(idx => correctAnswersSet.has(idx));

          return {
            questionId: question.id,
            questionText: question.question_text,
            options: questionOptions,
            userSelectedIndices,
            correctIndices: correctAnswers,
            isCorrect
          };
        });
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
        showCorrectAnswers,
        // Only include detailed results if admin enabled showing correct answers
        ...(showCorrectAnswers && { results: detailedResults }),
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
      answerText: q.answer_text,
      answerOptions: q.answer_options ? (typeof q.answer_options === 'string' ? JSON.parse(q.answer_options) : q.answer_options) : null,
      answerRating: q.answer_rating
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
  getResponseById
};
