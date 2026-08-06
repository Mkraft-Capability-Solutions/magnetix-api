const { promisePool: pool } = require('../../config/db');
const geminiAIService = require('../gemini/gemini_ai_service');
const lingo = require('./lingo_lab_service');

/**
 * Lingo Lab — Sentence Builder (Level 4) + Reading Lab (Level 5).
 *
 * Sentence Builder: unscramble sentences. AI generates fresh sentences when
 *   available; otherwise falls back to the example sentences already stored on
 *   vocabulary rows — so it works offline once vocab is seeded.
 * Reading Lab: a short passage + comprehension questions. AI generates and
 *   PERSISTS passages (stable, reusable); when AI is down a previously-generated
 *   passage is served. Only if none exist and AI is unavailable does it report
 *   aiUnavailable.
 *
 * Additive: one new `lingo_reading` table; everything else reuses existing tables.
 */

const LANG_NAMES = {
  es: 'Spanish', fr: 'French', de: 'German', it: 'Italian',
  pt: 'Portuguese', ja: 'Japanese', hi: 'Hindi', en: 'English',
};
const langName = (c) => LANG_NAMES[c] || c;

async function getActiveProfile(userId) {
  const [rows] = await pool.query(
    'SELECT target_language, native_language, proficiency FROM lingo_profiles WHERE user_id = ? ORDER BY is_active DESC, updated_at DESC LIMIT 1',
    [userId]
  );
  return rows[0] || null;
}

function extractJson(text, kind) {
  if (!text) return null;
  let t = String(text).trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const open = kind === 'array' ? '[' : '{';
  const close = kind === 'array' ? ']' : '}';
  const first = t.indexOf(open);
  const last = t.lastIndexOf(close);
  if (first === -1 || last === -1) return null;
  try { return JSON.parse(t.slice(first, last + 1)); } catch { return null; }
}

// ---------------------------------------------------------------- Sentence Builder
async function tryGenerateSentences(targetName, level, n) {
  try {
    const system = [
      `You create sentence-building exercises for a ${targetName} learner (level: ${level}).`,
      `Produce ${n} short, natural ${targetName} sentences (4-9 words each) with their English translations.`,
      `Return STRICT JSON ONLY — an array: [{"text":"<sentence>","translation":"<English>"}]`,
    ].join('\n');
    const raw = await geminiAIService.generateChatResponse(system, [{ role: 'user', content: `Give ${n} sentences.` }]);
    const arr = extractJson(raw, 'array');
    if (Array.isArray(arr)) {
      return arr.filter((s) => s && s.text && String(s.text).trim().split(/\s+/).length >= 2)
        .map((s) => ({ text: String(s.text).trim(), translation: s.translation ? String(s.translation).trim() : '' }));
    }
  } catch (e) { console.error('LingoLab sentence gen error:', e.message); }
  return null;
}

const getSentences = async (userId, lang, count) => {
  await lingo.ensureSchema();
  const n = Math.min(10, Math.max(3, parseInt(count, 10) || 6));
  const profile = await getActiveProfile(userId);
  const level = (profile && profile.proficiency) || 'beginner';

  if (process.env.GEMINI_API_KEY) {
    const gen = await tryGenerateSentences(langName(lang), level, n);
    if (gen && gen.length) return { success: true, data: gen.slice(0, n) };
  }
  // Seed fallback: example sentences from the vocabulary table.
  const [rows] = await pool.query(
    `SELECT example_sentence AS text, example_translation AS translation
       FROM lingo_vocabulary
      WHERE target_language = ? AND example_sentence IS NOT NULL AND example_sentence <> ''
      ORDER BY RAND() LIMIT ${n}`,
    [lang]
  );
  return { success: true, data: rows.map((r) => ({ text: r.text, translation: r.translation || '' })) };
};

const completeSentences = async (userId, lang, body) => {
  const total = Number(body.total) || 0;
  const correct = Number(body.correct) || 0;
  if (total <= 0) return { success: false, status: 400, message: 'No results submitted' };
  const accuracy = Math.round((correct / total) * 100);
  const xpEarned = correct * 8;
  await pool.query(
    'INSERT INTO lingo_activity (user_id, activity_type, target_language, total, correct, accuracy, xp_earned) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [userId, 'sentence', lang, total, correct, accuracy, xpEarned]
  );
  let award = null;
  try { award = await lingo.awardXp(userId, lang, xpEarned); } catch (e) { /* non-fatal */ }
  return { success: true, data: { total, correct, accuracy, xpEarned, ...(award || {}) } };
};

// ---------------------------------------------------------------- Reading Lab
let readingSchemaReady = false;
async function ensureReadingSchema() {
  if (readingSchemaReady) return;
  await pool.query(
    `CREATE TABLE IF NOT EXISTS lingo_reading (
       id BIGINT AUTO_INCREMENT PRIMARY KEY,
       target_language VARCHAR(50) NOT NULL,
       level VARCHAR(30) NULL,
       title VARCHAR(200) NULL,
       body TEXT NOT NULL,
       questions JSON NULL,
       created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
       KEY idx_lingo_reading_lang (target_language)
     ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`
  );
  readingSchemaReady = true;
}

async function tryGeneratePassage(targetName, level, nativeName) {
  try {
    const system = [
      `You write short reading exercises for a ${targetName} learner (level: ${level}).`,
      `Write a simple ${targetName} passage of 4-6 sentences on an everyday topic, then 3 multiple-choice comprehension questions (write the questions in ${nativeName}), each with 3 options and the correct option index (0-based).`,
      `Return STRICT JSON ONLY: {"title":"<short title>","body":"<passage>","questions":[{"q":"<question>","options":["a","b","c"],"answer":0}]}`,
    ].join('\n');
    const raw = await geminiAIService.generateChatResponse(system, [{ role: 'user', content: 'Write the passage.' }]);
    const obj = extractJson(raw, 'object');
    if (obj && obj.body && Array.isArray(obj.questions)) {
      const questions = obj.questions
        .filter((q) => q && q.q && Array.isArray(q.options) && q.options.length >= 2)
        .map((q) => ({ q: String(q.q), options: q.options.map(String), answer: Math.max(0, Math.min(q.options.length - 1, parseInt(q.answer, 10) || 0)) }));
      return { title: obj.title ? String(obj.title).slice(0, 200) : 'Reading', body: String(obj.body), questions };
    }
  } catch (e) { console.error('LingoLab reading gen error:', e.message); }
  return null;
}

const getReading = async (userId, lang) => {
  await ensureReadingSchema();
  const profile = await getActiveProfile(userId);
  const level = (profile && profile.proficiency) || 'beginner';
  const native = langName((profile && profile.native_language) || 'en');

  // AI-first: generate a fresh passage and persist it for offline reuse.
  if (process.env.GEMINI_API_KEY) {
    const gen = await tryGeneratePassage(langName(lang), level, native);
    if (gen) {
      const [ins] = await pool.query(
        'INSERT INTO lingo_reading (target_language, level, title, body, questions) VALUES (?, ?, ?, ?, ?)',
        [lang, level, gen.title, gen.body, JSON.stringify(gen.questions)]
      );
      return { success: true, data: { id: ins.insertId, title: gen.title, body: gen.body, questions: gen.questions } };
    }
  }
  // Fallback: a previously-generated passage for this language.
  const [rows] = await pool.query(
    'SELECT id, title, body, questions FROM lingo_reading WHERE target_language = ? ORDER BY RAND() LIMIT 1',
    [lang]
  );
  if (rows.length) {
    const r = rows[0];
    const q = typeof r.questions === 'string' ? (() => { try { return JSON.parse(r.questions); } catch { return []; } })() : (r.questions || []);
    return { success: true, data: { id: r.id, title: r.title, body: r.body, questions: q } };
  }
  return { success: true, data: { aiUnavailable: true } };
};

const completeReading = async (userId, lang, body) => {
  const total = Number(body.total) || 0;
  const correct = Number(body.correct) || 0;
  if (total <= 0) return { success: false, status: 400, message: 'No answers submitted' };
  const accuracy = Math.round((correct / total) * 100);
  const xpEarned = correct * 8;
  await pool.query(
    'INSERT INTO lingo_activity (user_id, activity_type, target_language, total, correct, accuracy, xp_earned) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [userId, 'reading', lang, total, correct, accuracy, xpEarned]
  );
  let award = null;
  try { award = await lingo.awardXp(userId, lang, xpEarned, { scoreField: 'reading_score', score: accuracy }); } catch (e) { /* non-fatal */ }
  return { success: true, data: { total, correct, accuracy, xpEarned, ...(award || {}) } };
};

module.exports = { getSentences, completeSentences, getReading, completeReading };
