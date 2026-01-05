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
      CONCAT(u.first_name, ' ', u.last_name) as created_by_name,
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
 * Create new feedback form with questions
 */
const createForm = async (formData, userUuid) => {
  const connection = await promisePool.getConnection();

  try {
    await connection.beginTransaction();

    const slug = generateSlug();
    const uuid = uuidv4();

    // Insert form
    const [formResult] = await connection.query(`
      INSERT INTO feedback_forms
      (uuid, slug, name, description, type, status, expiry_date, max_responses,
       one_per_browser, collect_name, collect_email, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      userUuid
    ]);

    const formId = formResult.insertId;

    // Insert questions
    if (formData.questions && formData.questions.length > 0) {
      for (let i = 0; i < formData.questions.length; i++) {
        const q = formData.questions[i];
        await connection.query(`
          INSERT INTO feedback_questions
          (form_id, question_order, question_type, question_text, is_required, options)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [
          formId,
          i + 1,
          q.type,
          q.text,
          q.required ? 1 : 0,
          q.options ? JSON.stringify(q.options) : null
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

    // Update form
    await connection.query(`
      UPDATE feedback_forms SET
        name = ?, description = ?, type = ?, status = ?,
        expiry_date = ?, max_responses = ?, one_per_browser = ?,
        collect_name = ?, collect_email = ?
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
      formId
    ]);

    // Delete existing questions and re-insert
    await connection.query('DELETE FROM feedback_questions WHERE form_id = ?', [formId]);

    if (formData.questions && formData.questions.length > 0) {
      for (let i = 0; i < formData.questions.length; i++) {
        const q = formData.questions[i];
        await connection.query(`
          INSERT INTO feedback_questions
          (form_id, question_order, question_type, question_text, is_required, options)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [
          formId,
          i + 1,
          q.type,
          q.text,
          q.required ? 1 : 0,
          q.options ? JSON.stringify(q.options) : null
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
      collectName: form.collect_name === 1,
      collectEmail: form.collect_email === 1,
      questions: questions.map(q => ({
        ...q,
        options: q.options ? (typeof q.options === 'string' ? JSON.parse(q.options) : q.options) : null
      }))
    }
  };
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

    // Insert response
    const [responseResult] = await connection.query(`
      INSERT INTO feedback_responses
      (form_id, browser_fingerprint, respondent_name, respondent_email, ip_address)
      VALUES (?, ?, ?, ?, ?)
    `, [
      form.id,
      responseData.browserFingerprint || null,
      responseData.name || null,
      responseData.email || null,
      responseData.ipAddress || null
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
    return { success: true, responseId };
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
  // Response stats
  const [stats] = await promisePool.query(`
    SELECT
      COUNT(*) as total_responses,
      COUNT(CASE WHEN submitted_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as responses_this_week,
      MIN(submitted_at) as first_response,
      MAX(submitted_at) as last_response
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

module.exports = {
  getAllForms,
  getFormById,
  createForm,
  updateForm,
  deleteForm,
  getPublicFormBySlug,
  submitResponse,
  getFormAnalytics,
  getFormResponses
};
