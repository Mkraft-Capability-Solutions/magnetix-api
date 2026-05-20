const { promisePool } = require('../../config/db');

const VALID_TYPES = new Set(['MCQ', 'T/F', 'Essay', 'Short']);
const VALID_DIFFICULTIES = new Set(['easy', 'medium', 'hard']);

const parseJsonOrNull = (raw) => {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== 'string') return raw;
  try {
    return JSON.parse(raw);
  } catch (_e) {
    return null;
  }
};

const mapRow = (row) => ({
  id: row.id,
  type: row.type,
  difficulty: row.difficulty,
  topic: row.topic,
  points: row.points,
  question: row.question,
  options: parseJsonOrNull(row.options) || undefined,
  correctAnswer: row.correct_answer || undefined,
});

const validatePayload = (payload, { partial = false } = {}) => {
  const errors = [];

  if (!partial || payload.type !== undefined) {
    if (!payload.type || !VALID_TYPES.has(payload.type)) {
      errors.push('type must be one of MCQ, T/F, Essay, Short');
    }
  }
  if (!partial || payload.difficulty !== undefined) {
    const d = payload.difficulty;
    if (d !== undefined && d !== null && !VALID_DIFFICULTIES.has(d)) {
      errors.push('difficulty must be one of easy, medium, hard');
    }
  }
  if (!partial || payload.question !== undefined) {
    if (!payload.question || !String(payload.question).trim()) {
      errors.push('question text is required');
    }
  }
  if (payload.points !== undefined && payload.points !== null) {
    const n = Number(payload.points);
    if (!Number.isFinite(n) || n < 0) errors.push('points must be a non-negative number');
  }
  if (payload.options !== undefined && payload.options !== null && !Array.isArray(payload.options)) {
    errors.push('options must be an array of strings');
  }
  return errors;
};

async function listQuestions({ search, topic, type } = {}) {
  const where = ['is_deleted = 0'];
  const params = [];
  if (topic && topic !== 'All Topics') {
    where.push('topic = ?');
    params.push(topic);
  }
  if (type && type !== 'All Types') {
    where.push('type = ?');
    params.push(type);
  }
  if (search && String(search).trim()) {
    where.push('(LOWER(question) LIKE ? OR LOWER(topic) LIKE ?)');
    const like = `%${String(search).trim().toLowerCase()}%`;
    params.push(like, like);
  }

  const [rows] = await promisePool.query(
    `SELECT id, type, difficulty, topic, points, question, options, correct_answer
       FROM assessment_question_bank
      WHERE ${where.join(' AND ')}
      ORDER BY id DESC`,
    params
  );
  return rows.map(mapRow);
}

async function getQuestion(id) {
  const [rows] = await promisePool.query(
    `SELECT id, type, difficulty, topic, points, question, options, correct_answer
       FROM assessment_question_bank
      WHERE id = ? AND is_deleted = 0`,
    [id]
  );
  return rows.length ? mapRow(rows[0]) : null;
}

async function createQuestion(payload, userUuid) {
  const errors = validatePayload(payload);
  if (errors.length) {
    const err = new Error(errors.join('; '));
    err.statusCode = 400;
    throw err;
  }

  const optionsJson = Array.isArray(payload.options) && payload.options.length > 0
    ? JSON.stringify(payload.options)
    : null;

  const [result] = await promisePool.query(
    `INSERT INTO assessment_question_bank
       (type, difficulty, topic, points, question, options, correct_answer, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      payload.type,
      payload.difficulty || 'medium',
      payload.topic || 'General',
      payload.points != null ? Number(payload.points) : 10,
      String(payload.question).trim(),
      optionsJson,
      payload.correctAnswer || null,
      userUuid || null,
    ]
  );

  return getQuestion(result.insertId);
}

async function updateQuestion(id, payload) {
  const existing = await getQuestion(id);
  if (!existing) {
    const err = new Error('Question not found');
    err.statusCode = 404;
    throw err;
  }
  const errors = validatePayload(payload, { partial: true });
  if (errors.length) {
    const err = new Error(errors.join('; '));
    err.statusCode = 400;
    throw err;
  }

  const fields = [];
  const params = [];

  const set = (column, value) => {
    fields.push(`${column} = ?`);
    params.push(value);
  };

  if (payload.type !== undefined) set('type', payload.type);
  if (payload.difficulty !== undefined) set('difficulty', payload.difficulty || 'medium');
  if (payload.topic !== undefined) set('topic', payload.topic || 'General');
  if (payload.points !== undefined) set('points', Number(payload.points));
  if (payload.question !== undefined) set('question', String(payload.question).trim());
  if (payload.options !== undefined) {
    const optionsJson = Array.isArray(payload.options) && payload.options.length > 0
      ? JSON.stringify(payload.options)
      : null;
    set('options', optionsJson);
  }
  if (payload.correctAnswer !== undefined) set('correct_answer', payload.correctAnswer || null);

  if (fields.length === 0) {
    return existing;
  }

  params.push(id);
  await promisePool.query(
    `UPDATE assessment_question_bank SET ${fields.join(', ')} WHERE id = ?`,
    params
  );

  return getQuestion(id);
}

async function deleteQuestion(id) {
  const existing = await getQuestion(id);
  if (!existing) {
    const err = new Error('Question not found');
    err.statusCode = 404;
    throw err;
  }
  await promisePool.query(
    `UPDATE assessment_question_bank SET is_deleted = 1 WHERE id = ?`,
    [id]
  );
  return { id };
}

module.exports = {
  listQuestions,
  getQuestion,
  createQuestion,
  updateQuestion,
  deleteQuestion,
};
