const { promisePool: pool } = require('../../config/db');
const geminiAIService = require('../gemini/gemini_ai_service');
const lingo = require('./lingo_lab_service');

/**
 * Lingo Lab — Text Conversation Lab (Level 6).
 *
 * A scenario-based chat with an AI language tutor that replies in the target
 * language, gently corrects the learner, translates its replies, and remembers
 * the conversation. Built on the existing shared Gemini service; when that key
 * is unavailable every call degrades gracefully to `aiUnavailable` so the UI can
 * show a clear state instead of erroring. Additive: its own `lingo_conversation*`
 * tables, no change to any existing feature.
 */

const LANG_NAMES = {
  es: 'Spanish', fr: 'French', de: 'German', it: 'Italian',
  pt: 'Portuguese', ja: 'Japanese', hi: 'Hindi', en: 'English',
};
const langName = (c) => LANG_NAMES[c] || c;

const SCENARIOS = {
  greetings: { title: 'Greetings & Introductions', context: 'meeting someone new, exchanging greetings and basic introductions' },
  restaurant: { title: 'At a Restaurant', context: 'ordering food and drinks at a restaurant as the customer' },
  shopping: { title: 'Shopping', context: 'shopping for clothes or groceries and asking about prices' },
  directions: { title: 'Asking for Directions', context: 'asking for and understanding directions around a city' },
  hotel: { title: 'At a Hotel', context: 'checking into a hotel and asking about amenities' },
  airport: { title: 'At the Airport', context: 'checking in for a flight and going through the airport' },
  smalltalk: { title: 'Everyday Small Talk', context: 'casual small talk about daily life, hobbies and the weather' },
  interview: { title: 'Job Interview', context: 'a friendly job interview, answering common questions' },
};

const LINGO_CONV_SQL = [
  `CREATE TABLE IF NOT EXISTS lingo_conversations (
     id BIGINT AUTO_INCREMENT PRIMARY KEY,
     user_id VARCHAR(36) NOT NULL,
     target_language VARCHAR(50) NOT NULL,
     scenario VARCHAR(50) NOT NULL,
     title VARCHAR(150) NULL,
     created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
     updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
     KEY idx_lingo_conv_user (user_id, target_language, updated_at)
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,
  `CREATE TABLE IF NOT EXISTS lingo_conversation_messages (
     id BIGINT AUTO_INCREMENT PRIMARY KEY,
     conversation_id BIGINT NOT NULL,
     role VARCHAR(12) NOT NULL,
     content TEXT NOT NULL,
     translation TEXT NULL,
     correction JSON NULL,
     score INT NULL,
     created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
     KEY idx_lingo_msg_conv (conversation_id, id)
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,
];

let convSchemaReady = false;
async function ensureConvSchema() {
  if (convSchemaReady) return;
  for (const ddl of LINGO_CONV_SQL) await pool.query(ddl);
  convSchemaReady = true;
}

function extractJson(text) {
  if (!text) return null;
  let t = String(text).trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const first = t.indexOf('{');
  const last = t.lastIndexOf('}');
  if (first === -1 || last === -1) return null;
  try {
    return JSON.parse(t.slice(first, last + 1));
  } catch {
    return null;
  }
}

async function getActiveProfile(userId) {
  const [rows] = await pool.query(
    'SELECT target_language, native_language, proficiency FROM lingo_profiles WHERE user_id = ? ORDER BY is_active DESC, updated_at DESC LIMIT 1',
    [userId]
  );
  return rows[0] || null;
}

function buildSystemPrompt(profile, scenario, isOpener) {
  const target = langName(profile.target_language);
  const native = langName(profile.native_language || 'en');
  const level = profile.proficiency || 'beginner';
  return [
    `You are "Lingo", a warm, patient AI language tutor helping a learner practise ${target} through a role-play.`,
    `Scenario: ${scenario.context}.`,
    `The learner's native language is ${native}; their level is ${level}.`,
    `RULES:`,
    `- Reply in ${target}, using vocabulary/grammar suitable for a ${level} learner. Keep replies to 1-2 short sentences and keep the conversation going with a simple question.`,
    `- Stay in character for the scenario.`,
    isOpener
      ? `- This is the first message: greet the learner and open the scenario. There is nothing to correct yet.`
      : `- Gently correct the learner's most recent message ONLY if it has a real mistake. Be encouraging, never harsh.`,
    `- Always give an English translation of your reply.`,
    `- Rate the learner's most recent message from 0-100 for correctness and naturalness (use 100 for the opener).`,
    `Respond with STRICT JSON ONLY (no markdown, no extra text) in exactly this shape:`,
    `{"reply":"<reply in ${target}>","replyTranslation":"<English translation>","correction":{"hasError":true|false,"corrected":"<corrected learner message or empty>","explanation":"<short friendly note in ${native} or empty>"},"score":<0-100>,"tip":"<one short encouragement/tip in ${native}>"}`,
  ].join('\n');
}

// Ask Gemini for the tutor's structured reply. Returns { ok, data } or { ok:false }.
async function askTutor(profile, scenario, history, isOpener) {
  try {
    const system = buildSystemPrompt(profile, scenario, isOpener);
    const raw = await geminiAIService.generateChatResponse(system, history);
    const parsed = extractJson(raw);
    if (parsed && parsed.reply) {
      return {
        ok: true,
        data: {
          reply: String(parsed.reply),
          replyTranslation: parsed.replyTranslation ? String(parsed.replyTranslation) : null,
          correction: parsed.correction && parsed.correction.hasError
            ? { hasError: true, corrected: parsed.correction.corrected || '', explanation: parsed.correction.explanation || '' }
            : { hasError: false },
          tip: parsed.tip ? String(parsed.tip) : null,
          score: typeof parsed.score === 'number' ? Math.max(0, Math.min(100, Math.round(parsed.score))) : 80,
        },
      };
    }
    // Model replied but not as JSON — use the raw text as the reply.
    if (raw && raw.trim()) {
      return { ok: true, data: { reply: raw.trim(), replyTranslation: null, correction: { hasError: false }, tip: null, score: 80 } };
    }
    return { ok: false };
  } catch (e) {
    console.error('LingoLab tutor AI error:', e.message);
    return { ok: false };
  }
}

const mapMessageRow = (m) => ({
  id: m.id,
  role: m.role,
  content: m.content,
  translation: m.translation || null,
  correction: m.correction || null,
  score: m.score,
  createdAt: m.created_at,
});

const listScenarios = () =>
  Object.entries(SCENARIOS).map(([key, v]) => ({ key, title: v.title, context: v.context }));

const listConversations = async (userId) => {
  await ensureConvSchema();
  const lang = await lingo.getActiveLanguage(userId);
  if (!lang) return { success: true, data: [] };
  const [rows] = await pool.query(
    `SELECT c.id, c.scenario, c.title, DATE_FORMAT(c.updated_at, '%Y-%m-%d %H:%i') AS updatedAt,
            (SELECT COUNT(*) FROM lingo_conversation_messages m WHERE m.conversation_id = c.id) AS messageCount
       FROM lingo_conversations c
      WHERE c.user_id = ? AND c.target_language = ?
      ORDER BY c.updated_at DESC
      LIMIT 30`,
    [userId, lang]
  );
  return { success: true, data: rows };
};

const getConversation = async (userId, conversationId) => {
  await ensureConvSchema();
  const [conv] = await pool.query(
    'SELECT id, scenario, title, target_language FROM lingo_conversations WHERE id = ? AND user_id = ?',
    [conversationId, userId]
  );
  if (conv.length === 0) return { success: false, status: 404, message: 'Conversation not found' };
  const [msgs] = await pool.query(
    'SELECT * FROM lingo_conversation_messages WHERE conversation_id = ? ORDER BY id ASC',
    [conversationId]
  );
  return {
    success: true,
    data: {
      id: conv[0].id,
      scenario: conv[0].scenario,
      title: conv[0].title,
      targetLanguage: conv[0].target_language,
      messages: msgs.map(mapMessageRow),
    },
  };
};

const startConversation = async (userId, scenarioKey) => {
  await ensureConvSchema();
  const scenario = SCENARIOS[scenarioKey];
  if (!scenario) return { success: false, status: 400, message: 'Unknown scenario' };
  const profile = await getActiveProfile(userId);
  if (!profile) return { success: false, status: 400, message: 'Set up a language first' };

  const [ins] = await pool.query(
    'INSERT INTO lingo_conversations (user_id, target_language, scenario, title) VALUES (?, ?, ?, ?)',
    [userId, profile.target_language, scenarioKey, scenario.title]
  );
  const conversationId = ins.insertId;

  const opener = await askTutor(profile, scenario, [{ role: 'user', content: 'Let us begin the conversation.' }], true);
  if (!opener.ok) {
    return { success: true, data: { id: conversationId, scenario: scenarioKey, title: scenario.title, messages: [], aiUnavailable: true } };
  }
  const [msgIns] = await pool.query(
    'INSERT INTO lingo_conversation_messages (conversation_id, role, content, translation) VALUES (?, ?, ?, ?)',
    [conversationId, 'assistant', opener.data.reply, opener.data.replyTranslation]
  );
  return {
    success: true,
    data: {
      id: conversationId,
      scenario: scenarioKey,
      title: scenario.title,
      messages: [{ id: msgIns.insertId, role: 'assistant', content: opener.data.reply, translation: opener.data.replyTranslation, correction: null, score: null }],
    },
  };
};

const sendMessage = async (userId, conversationId, text) => {
  await ensureConvSchema();
  const message = String(text || '').trim();
  if (!message) return { success: false, status: 400, message: 'Message is required' };

  const [conv] = await pool.query(
    'SELECT id, scenario, target_language FROM lingo_conversations WHERE id = ? AND user_id = ?',
    [conversationId, userId]
  );
  if (conv.length === 0) return { success: false, status: 404, message: 'Conversation not found' };
  const scenario = SCENARIOS[conv[0].scenario] || SCENARIOS.smalltalk;
  const profile = await getActiveProfile(userId);
  if (!profile) return { success: false, status: 400, message: 'Set up a language first' };

  // Store the learner's message first (so it's never lost, even if AI fails).
  await pool.query(
    'INSERT INTO lingo_conversation_messages (conversation_id, role, content) VALUES (?, ?, ?)',
    [conversationId, 'user', message]
  );
  await pool.query('UPDATE lingo_conversations SET updated_at = NOW() WHERE id = ?', [conversationId]);

  // Build recent history (last ~12 messages) for context.
  const [recent] = await pool.query(
    'SELECT role, content FROM lingo_conversation_messages WHERE conversation_id = ? ORDER BY id DESC LIMIT 12',
    [conversationId]
  );
  const history = recent.reverse().map((m) => ({ role: m.role, content: m.content }));

  const reply = await askTutor(profile, scenario, history, false);
  if (!reply.ok) {
    return { success: true, data: { aiUnavailable: true } };
  }

  const correctionJson = reply.data.correction && reply.data.correction.hasError ? JSON.stringify(reply.data.correction) : null;
  const [msgIns] = await pool.query(
    'INSERT INTO lingo_conversation_messages (conversation_id, role, content, translation, correction, score) VALUES (?, ?, ?, ?, ?, ?)',
    [conversationId, 'assistant', reply.data.reply, reply.data.replyTranslation, correctionJson, reply.data.score]
  );

  // Reward the exchange (XP + rolling conversation score) for the active language.
  let award = null;
  try {
    award = await lingo.awardXp(userId, conv[0].target_language, 8, { conversationScore: reply.data.score });
  } catch (e) { /* non-fatal */ }

  return {
    success: true,
    data: {
      message: {
        id: msgIns.insertId,
        role: 'assistant',
        content: reply.data.reply,
        translation: reply.data.replyTranslation,
        correction: reply.data.correction && reply.data.correction.hasError ? reply.data.correction : null,
        tip: reply.data.tip,
        score: reply.data.score,
      },
      award,
    },
  };
};

module.exports = {
  listScenarios,
  listConversations,
  getConversation,
  startConversation,
  sendMessage,
};
