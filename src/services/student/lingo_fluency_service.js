const { promisePool: pool } = require('../../config/db');
const geminiAIService = require('../gemini/gemini_ai_service');
const lingo = require('./lingo_lab_service');

/**
 * Lingo Lab — Fluency Lab (Level 9).
 *
 * The learner responds (spoken → transcribed, or typed) to an advanced prompt
 * (storytelling, opinion, describe, debate). Gemini evaluates the response on
 * several dimensions and returns coaching. Degrades to `aiUnavailable`.
 */

const LANG_NAMES = {
  es: 'Spanish', fr: 'French', de: 'German', it: 'Italian',
  pt: 'Portuguese', ja: 'Japanese', hi: 'Hindi', en: 'English',
};
const langName = (c) => LANG_NAMES[c] || c;

const FLUENCY_PROMPTS = [
  { key: 'day', category: 'Describe', prompt: 'Describe your typical day from morning to night.' },
  { key: 'hometown', category: 'Describe', prompt: 'Describe your hometown and what you like about it.' },
  { key: 'story', category: 'Storytelling', prompt: 'Tell a short story about a memorable trip you took.' },
  { key: 'opinion_tech', category: 'Opinion', prompt: 'Do you think technology makes our lives better? Explain your opinion.' },
  { key: 'opinion_remote', category: 'Opinion', prompt: 'Is working from home better than working in an office? Why?' },
  { key: 'debate_city', category: 'Debate', prompt: 'Argue for or against living in a big city instead of the countryside.' },
  { key: 'dream', category: 'Storytelling', prompt: 'Describe your dream holiday and why you would enjoy it.' },
  { key: 'advice', category: 'Opinion', prompt: 'What advice would you give someone learning your native language?' },
];

const listPrompts = () => FLUENCY_PROMPTS;

async function getActiveProfile(userId) {
  const [rows] = await pool.query(
    'SELECT target_language, native_language, proficiency FROM lingo_profiles WHERE user_id = ? ORDER BY is_active DESC, updated_at DESC LIMIT 1',
    [userId]
  );
  return rows[0] || null;
}

function extractJson(text) {
  if (!text) return null;
  let t = String(text).trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const first = t.indexOf('{');
  const last = t.lastIndexOf('}');
  if (first === -1 || last === -1) return null;
  try { return JSON.parse(t.slice(first, last + 1)); } catch { return null; }
}

const evaluate = async (userId, body) => {
  const promptText = String((body && body.prompt) || '').trim();
  const transcript = String((body && body.transcript) || '').trim();
  if (!transcript) return { success: false, status: 400, message: 'A spoken or typed response is required' };

  const profile = await getActiveProfile(userId);
  if (!profile) return { success: false, status: 400, message: 'Set up a language first' };
  const target = langName(profile.target_language);
  const native = langName(profile.native_language || 'en');

  const system = [
    `You are a supportive ${target} speaking examiner (CEFR-style).`,
    `The learner was asked: "${promptText}".`,
    `Their spoken response (transcribed) is provided. Assess it fairly and encouragingly.`,
    `Respond with STRICT JSON ONLY in this shape:`,
    `{"scores":{"grammar":0-100,"vocabulary":0-100,"fluency":0-100,"naturalness":0-100,"complexity":0-100},"overall":0-100,"level":"<CEFR band like A2/B1>","feedback":"<2-3 sentences in ${native}>","corrected":"<a cleaned-up, natural ${target} version of what they said>","suggestions":["<one better phrase or word in ${target} with a short ${native} note>"]}`,
  ].join('\n');

  let parsed;
  try {
    const raw = await geminiAIService.generateChatResponse(system, [{ role: 'user', content: transcript }]);
    parsed = extractJson(raw);
  } catch (e) {
    console.error('LingoLab fluency eval error:', e.message);
    return { success: true, data: { aiUnavailable: true } };
  }
  if (!parsed || !parsed.scores) return { success: true, data: { aiUnavailable: true } };

  const overall = typeof parsed.overall === 'number' ? Math.max(0, Math.min(100, Math.round(parsed.overall))) : 70;
  let award = null;
  try {
    award = await lingo.awardXp(userId, profile.target_language, 15, { conversationScore: overall });
  } catch (e) { /* non-fatal */ }

  return {
    success: true,
    data: {
      scores: parsed.scores,
      overall,
      level: parsed.level || null,
      feedback: parsed.feedback || '',
      corrected: parsed.corrected || '',
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
      award,
    },
  };
};

module.exports = { listPrompts, evaluate };
