const { promisePool: pool } = require('../../config/db');
const geminiAIService = require('../gemini/gemini_ai_service');
const lingo = require('./lingo_lab_service');

/**
 * Lingo Lab — admin content seeding.
 *
 * Lets a Super Admin pre-populate the vocabulary that powers the Vocabulary,
 * Pronunciation and Listening labs (all vocabulary-driven). Content can be
 * generated with AI (Gemini) or added manually, so the learner experience works
 * on seeded data even when runtime AI is unavailable. Additive: writes only to
 * the existing `lingo_vocabulary` table.
 */

const LANG_NAMES = {
  es: 'Spanish', fr: 'French', de: 'German', it: 'Italian',
  pt: 'Portuguese', ja: 'Japanese', hi: 'Hindi', en: 'English',
};
const langName = (c) => LANG_NAMES[c] || c;

function extractJsonArray(text) {
  if (!text) return null;
  let t = String(text).trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const first = t.indexOf('[');
  const last = t.lastIndexOf(']');
  if (first === -1 || last === -1) return null;
  try { return JSON.parse(t.slice(first, last + 1)); } catch { return null; }
}

function buildPrompt(targetName, category, n) {
  return [
    `You generate vocabulary for a language-learning app.`,
    `Produce exactly ${n} common, beginner-friendly ${targetName} words in the category "${category}".`,
    `For each word give: the word in ${targetName}, an English translation, IPA pronunciation, one very simple example sentence in ${targetName}, that sentence's English translation, and a difficulty from 1 (easiest) to 3.`,
    `Return STRICT JSON ONLY — a JSON array, no markdown, in exactly this shape:`,
    `[{"word":"...","translation":"...","ipa":"...","example_sentence":"...","example_translation":"...","difficulty":1}]`,
  ].join('\n');
}

const toRow = (lang, cat, it) => [
  lang,
  cat,
  String(it.word).trim().slice(0, 150),
  String(it.translation).trim().slice(0, 255),
  it.ipa ? String(it.ipa).slice(0, 150) : null,
  it.example_sentence ? String(it.example_sentence).slice(0, 500) : null,
  it.example_translation ? String(it.example_translation).slice(0, 500) : null,
  Math.min(3, Math.max(1, parseInt(it.difficulty, 10) || 1)),
];

const INSERT_SQL =
  `INSERT IGNORE INTO lingo_vocabulary
     (target_language, category, word, translation, ipa, example_sentence, example_translation, difficulty)
   VALUES ?`;

const generate = async ({ language, category, count }) => {
  await lingo.ensureSchema();
  const lang = String(language || '').trim();
  const cat = String(category || '').trim().toLowerCase();
  const n = Math.min(30, Math.max(1, parseInt(count, 10) || 10));
  if (!lang || !cat) return { success: false, status: 400, message: 'language and category are required' };

  let items;
  try {
    const raw = await geminiAIService.generateChatResponse(buildPrompt(langName(lang), cat, n), [
      { role: 'user', content: `Generate ${n} words for "${cat}".` },
    ]);
    items = extractJsonArray(raw);
  } catch (e) {
    console.error('LingoLab seed AI error:', e.message);
    return { success: true, data: { aiUnavailable: true } };
  }
  if (!Array.isArray(items) || items.length === 0) return { success: true, data: { aiUnavailable: true } };

  const rows = items
    .filter((it) => it && it.word && it.translation)
    .slice(0, n)
    .map((it) => toRow(lang, cat, it));
  if (rows.length === 0) return { success: true, data: { inserted: 0, items: [] } };

  const [res] = await pool.query(INSERT_SQL, [rows]);
  return {
    success: true,
    data: {
      inserted: res.affectedRows,
      requested: n,
      generated: rows.length,
      items: rows.map((r) => ({ word: r[2], translation: r[3], ipa: r[4] })),
    },
  };
};

const addWord = async (item) => {
  await lingo.ensureSchema();
  const lang = String(item.language || '').trim();
  const cat = String(item.category || '').trim().toLowerCase();
  const word = String(item.word || '').trim();
  const translation = String(item.translation || '').trim();
  if (!lang || !cat || !word || !translation) {
    return { success: false, status: 400, message: 'language, category, word and translation are required' };
  }
  const [res] = await pool.query(INSERT_SQL, [[toRow(lang, cat, {
    word, translation, ipa: item.ipa, example_sentence: item.exampleSentence,
    example_translation: item.exampleTranslation, difficulty: item.difficulty,
  })]]);
  return { success: true, data: { inserted: res.affectedRows } };
};

const summary = async () => {
  await lingo.ensureSchema();
  const [rows] = await pool.query(
    `SELECT target_language AS language, category, COUNT(*) AS total
       FROM lingo_vocabulary GROUP BY target_language, category
      ORDER BY target_language, category`
  );
  return { success: true, data: rows.map((r) => ({ language: r.language, category: r.category, total: Number(r.total) })) };
};

const deleteCategory = async ({ language, category }) => {
  await lingo.ensureSchema();
  const lang = String(language || '').trim();
  const cat = String(category || '').trim().toLowerCase();
  if (!lang || !cat) return { success: false, status: 400, message: 'language and category are required' };
  const [res] = await pool.query('DELETE FROM lingo_vocabulary WHERE target_language = ? AND category = ?', [lang, cat]);
  return { success: true, data: { deleted: res.affectedRows } };
};

module.exports = { generate, addWord, summary, deleteCategory };
