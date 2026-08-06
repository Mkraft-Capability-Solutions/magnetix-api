const { promisePool: pool } = require('../../config/db');

/**
 * Lingo Lab AI — core learning-engine service (Phase 1).
 *
 * Scope: Level 0 (onboarding + AI learning profile/roadmap) and Level 1
 * (data-driven vocabulary) plus the dashboard, spaced-repetition scheduler and
 * a self-contained gamification layer (XP / coins / level / streak).
 *
 * Everything is additive and self-contained under `lingo_*` tables so it cannot
 * affect any existing feature. Tables are created + seeded idempotently on first
 * use (and by the migration for proper deploys). The engine is language-agnostic;
 * a small starter vocabulary is seeded so it works even while the shared AI key
 * is unavailable. AI (roadmap/examples) is an OPTIONAL enhancement layered on top
 * behind lingo_ai_provider — never a hard dependency.
 */

// ---------------------------------------------------------------- Schema
const LINGO_SCHEMA_SQL = [
  // One profile per (user, target_language) so a learner can study multiple
  // languages; exactly one is `is_active` at a time.
  `CREATE TABLE IF NOT EXISTS lingo_profiles (
     id BIGINT AUTO_INCREMENT PRIMARY KEY,
     user_id VARCHAR(36) NOT NULL,
     native_language VARCHAR(50) NULL,
     target_language VARCHAR(50) NOT NULL,
     proficiency VARCHAR(30) NULL,
     goal VARCHAR(60) NULL,
     daily_minutes INT NOT NULL DEFAULT 10,
     pace VARCHAR(20) NULL,
     accent VARCHAR(30) NULL,
     voice VARCHAR(30) NULL,
     age_group VARCHAR(20) NULL,
     interests JSON NULL,
     roadmap JSON NULL,
     is_active TINYINT NOT NULL DEFAULT 1,
     created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
     updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
     UNIQUE KEY uq_lingo_profile_user_lang (user_id, target_language),
     KEY idx_lingo_profile_active (user_id, is_active)
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,

  // Per-language gamification/progress (replaces the single-row lingo_stats).
  `CREATE TABLE IF NOT EXISTS lingo_progress_stats (
     user_id VARCHAR(36) NOT NULL,
     target_language VARCHAR(50) NOT NULL,
     xp INT NOT NULL DEFAULT 0,
     coins INT NOT NULL DEFAULT 0,
     level INT NOT NULL DEFAULT 1,
     current_streak INT NOT NULL DEFAULT 0,
     longest_streak INT NOT NULL DEFAULT 0,
     last_activity_date DATE NULL,
     vocab_learned INT NOT NULL DEFAULT 0,
     pronunciation_score INT NOT NULL DEFAULT 0,
     listening_score INT NOT NULL DEFAULT 0,
     reading_score INT NOT NULL DEFAULT 0,
     conversation_score INT NOT NULL DEFAULT 0,
     updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
     PRIMARY KEY (user_id, target_language)
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,

  `CREATE TABLE IF NOT EXISTS lingo_vocabulary (
     id BIGINT AUTO_INCREMENT PRIMARY KEY,
     target_language VARCHAR(50) NOT NULL,
     category VARCHAR(50) NOT NULL,
     word VARCHAR(150) NOT NULL,
     translation VARCHAR(255) NOT NULL,
     ipa VARCHAR(150) NULL,
     example_sentence VARCHAR(500) NULL,
     example_translation VARCHAR(500) NULL,
     image_url VARCHAR(500) NULL,
     difficulty TINYINT NOT NULL DEFAULT 1,
     created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
     UNIQUE KEY uq_lingo_vocab (target_language, category, word),
     KEY idx_lingo_vocab_lang_cat (target_language, category)
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,

  `CREATE TABLE IF NOT EXISTS lingo_vocab_progress (
     id BIGINT AUTO_INCREMENT PRIMARY KEY,
     user_id VARCHAR(36) NOT NULL,
     vocab_id BIGINT NOT NULL,
     times_seen INT NOT NULL DEFAULT 0,
     times_correct INT NOT NULL DEFAULT 0,
     times_wrong INT NOT NULL DEFAULT 0,
     mastery_level TINYINT NOT NULL DEFAULT 0,
     ease_factor DECIMAL(4,2) NOT NULL DEFAULT 2.50,
     interval_days INT NOT NULL DEFAULT 0,
     next_review_at DATETIME NULL,
     last_reviewed_at DATETIME NULL,
     UNIQUE KEY uq_lingo_vp (user_id, vocab_id),
     KEY idx_lingo_vp_review (user_id, next_review_at)
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,

  `CREATE TABLE IF NOT EXISTS lingo_activity (
     id BIGINT AUTO_INCREMENT PRIMARY KEY,
     user_id VARCHAR(36) NOT NULL,
     activity_type VARCHAR(40) NOT NULL,
     target_language VARCHAR(50) NULL,
     category VARCHAR(50) NULL,
     total INT NOT NULL DEFAULT 0,
     correct INT NOT NULL DEFAULT 0,
     accuracy INT NOT NULL DEFAULT 0,
     xp_earned INT NOT NULL DEFAULT 0,
     created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
     KEY idx_lingo_activity_user (user_id, created_at)
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,

  `CREATE TABLE IF NOT EXISTS lingo_stats (
     user_id VARCHAR(36) NOT NULL PRIMARY KEY,
     xp INT NOT NULL DEFAULT 0,
     coins INT NOT NULL DEFAULT 0,
     level INT NOT NULL DEFAULT 1,
     current_streak INT NOT NULL DEFAULT 0,
     longest_streak INT NOT NULL DEFAULT 0,
     last_activity_date DATE NULL,
     vocab_learned INT NOT NULL DEFAULT 0,
     pronunciation_score INT NOT NULL DEFAULT 0,
     listening_score INT NOT NULL DEFAULT 0,
     reading_score INT NOT NULL DEFAULT 0,
     conversation_score INT NOT NULL DEFAULT 0,
     updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,

  // Admin-controlled settings (single global row, id=1). unlock_mode:
  //   'progressive' — levels unlock as the learner completes prior ones (default)
  //   'all'         — every level is open from the start.
  `CREATE TABLE IF NOT EXISTS lingo_settings (
     id INT NOT NULL PRIMARY KEY,
     unlock_mode VARCHAR(20) NOT NULL DEFAULT 'progressive',
     updated_by VARCHAR(36) NULL,
     updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,
];

// Small language-agnostic starter set (Spanish) so the engine works with zero AI.
// category | word | translation | ipa | example | example_translation | difficulty
const SEED_VOCAB = [
  ['es', 'greetings', 'Hola', 'Hello', 'ˈola', '¡Hola! ¿Cómo estás?', 'Hello! How are you?', 1],
  ['es', 'greetings', 'Buenos días', 'Good morning', 'ˈbwenos ˈdi.as', 'Buenos días, señora.', 'Good morning, madam.', 1],
  ['es', 'greetings', 'Gracias', 'Thank you', 'ˈɡɾa.sjas', 'Muchas gracias por tu ayuda.', 'Thank you very much for your help.', 1],
  ['es', 'greetings', 'Adiós', 'Goodbye', 'aˈðjos', 'Adiós, hasta mañana.', 'Goodbye, see you tomorrow.', 1],
  ['es', 'greetings', 'Por favor', 'Please', 'poɾ faˈβoɾ', 'Un café, por favor.', 'A coffee, please.', 1],
  ['es', 'numbers', 'Uno', 'One', 'ˈuno', 'Tengo uno.', 'I have one.', 1],
  ['es', 'numbers', 'Dos', 'Two', 'dos', 'Quiero dos, por favor.', 'I want two, please.', 1],
  ['es', 'numbers', 'Tres', 'Three', 'tɾes', 'Son las tres.', "It's three o'clock.", 1],
  ['es', 'numbers', 'Cuatro', 'Four', 'ˈkwatɾo', 'Hay cuatro sillas.', 'There are four chairs.', 1],
  ['es', 'numbers', 'Cinco', 'Five', 'ˈsiŋko', 'Cinco minutos más.', 'Five more minutes.', 1],
  ['es', 'colors', 'Rojo', 'Red', 'ˈroxo', 'El coche es rojo.', 'The car is red.', 1],
  ['es', 'colors', 'Azul', 'Blue', 'aˈsul', 'El cielo es azul.', 'The sky is blue.', 1],
  ['es', 'colors', 'Verde', 'Green', 'ˈbeɾðe', 'La hierba es verde.', 'The grass is green.', 1],
  ['es', 'colors', 'Amarillo', 'Yellow', 'amaˈɾiʎo', 'El sol es amarillo.', 'The sun is yellow.', 2],
  ['es', 'colors', 'Negro', 'Black', 'ˈneɣɾo', 'El gato es negro.', 'The cat is black.', 1],
  ['es', 'food', 'Agua', 'Water', 'ˈaɣwa', 'Quiero un vaso de agua.', 'I want a glass of water.', 1],
  ['es', 'food', 'Pan', 'Bread', 'pan', 'El pan está fresco.', 'The bread is fresh.', 1],
  ['es', 'food', 'Manzana', 'Apple', 'manˈsana', 'Como una manzana.', 'I eat an apple.', 1],
  ['es', 'food', 'Café', 'Coffee', 'kaˈfe', 'Me gusta el café.', 'I like coffee.', 1],
  ['es', 'food', 'Leche', 'Milk', 'ˈletʃe', 'La leche está fría.', 'The milk is cold.', 1],
  ['es', 'family', 'Madre', 'Mother', 'ˈmaðɾe', 'Mi madre es doctora.', 'My mother is a doctor.', 1],
  ['es', 'family', 'Padre', 'Father', 'ˈpaðɾe', 'Mi padre trabaja aquí.', 'My father works here.', 1],
  ['es', 'family', 'Hermano', 'Brother', 'eɾˈmano', 'Tengo un hermano.', 'I have a brother.', 1],
  ['es', 'family', 'Hija', 'Daughter', 'ˈixa', 'Su hija tiene cinco años.', 'His daughter is five years old.', 2],
  ['es', 'family', 'Amigo', 'Friend', 'aˈmiɣo', 'Él es mi amigo.', 'He is my friend.', 1],
];

// Guarded, idempotent upgrades for DBs created before multi-language support.
async function ensureMigrations() {
  const [colRows] = await pool.query(
    `SELECT COUNT(*) AS c FROM information_schema.columns
      WHERE table_schema = DATABASE() AND table_name = 'lingo_profiles' AND column_name = 'is_active'`
  );
  if (Number(colRows[0].c) === 0) {
    await pool.query('ALTER TABLE lingo_profiles ADD COLUMN is_active TINYINT NOT NULL DEFAULT 1');
  }
  const [oldIdx] = await pool.query(
    `SELECT COUNT(*) AS c FROM information_schema.statistics
      WHERE table_schema = DATABASE() AND table_name = 'lingo_profiles' AND index_name = 'uq_lingo_profile_user'`
  );
  if (Number(oldIdx[0].c) > 0) {
    await pool.query('ALTER TABLE lingo_profiles DROP INDEX uq_lingo_profile_user');
  }
  const [newIdx] = await pool.query(
    `SELECT COUNT(*) AS c FROM information_schema.statistics
      WHERE table_schema = DATABASE() AND table_name = 'lingo_profiles' AND index_name = 'uq_lingo_profile_user_lang'`
  );
  if (Number(newIdx[0].c) === 0) {
    await pool.query('ALTER TABLE lingo_profiles ADD UNIQUE KEY uq_lingo_profile_user_lang (user_id, target_language)');
  }
  // Add target_language to lingo_activity if missing (per-language "today" stats).
  const [actCol] = await pool.query(
    `SELECT COUNT(*) AS c FROM information_schema.columns
      WHERE table_schema = DATABASE() AND table_name = 'lingo_activity' AND column_name = 'target_language'`
  );
  if (Number(actCol[0].c) === 0) {
    await pool.query('ALTER TABLE lingo_activity ADD COLUMN target_language VARCHAR(50) NULL AFTER activity_type');
  }
}

let schemaReady = false;
async function ensureSchema() {
  if (schemaReady) return;
  for (const ddl of LINGO_SCHEMA_SQL) await pool.query(ddl);
  await ensureMigrations();
  // Idempotent seed (INSERT IGNORE against the unique key).
  await pool.query(
    `INSERT IGNORE INTO lingo_vocabulary
       (target_language, category, word, translation, ipa, example_sentence, example_translation, difficulty)
     VALUES ?`,
    [SEED_VOCAB]
  );
  schemaReady = true;
}

// ---------------------------------------------------------------- helpers
const LEVEL_XP = 100; // xp per level (simple linear curve)
const levelFromXp = (xp) => 1 + Math.floor((Number(xp) || 0) / LEVEL_XP);
const todayStr = () => new Date().toISOString().slice(0, 10);

function daysBetween(fromDateStr, toDateStr) {
  const a = new Date(`${fromDateStr}T00:00:00Z`).getTime();
  const b = new Date(`${toDateStr}T00:00:00Z`).getTime();
  return Math.round((b - a) / 86400000);
}

// Deterministic 9-level roadmap (AI can enrich later; never required).
function buildRoadmap(profile) {
  const minutes = Number(profile.daily_minutes) || 10;
  const prof = (profile.proficiency || 'beginner').toLowerCase();
  const startLevel = prof.includes('advanced') ? 6 : prof.includes('intermediate') ? 4 : prof.includes('elementary') ? 2 : 1;
  const stages = [
    { level: 0, key: 'onboarding', title: 'Onboarding', focus: 'Your learning profile & goals' },
    { level: 1, key: 'vocabulary', title: 'Vocabulary Builder', focus: 'Core words, greetings, numbers, colors' },
    { level: 2, key: 'pronunciation', title: 'Pronunciation Lab', focus: 'Speak and get AI feedback' },
    { level: 3, key: 'listening', title: 'Listening Lab', focus: 'Understand spoken language' },
    { level: 4, key: 'sentence', title: 'Sentence Builder', focus: 'Construct correct sentences' },
    { level: 5, key: 'reading', title: 'Reading Lab', focus: 'Read stories & dialogues' },
    { level: 6, key: 'text_chat', title: 'Text Conversation', focus: 'Chat with your AI tutor' },
    { level: 7, key: 'voice_chat', title: 'Voice Conversation', focus: 'Real-time spoken practice' },
    { level: 8, key: 'roleplay', title: 'Roleplay Lab', focus: 'Real-world scenarios' },
    { level: 9, key: 'fluency', title: 'Fluency Lab', focus: 'Debates, storytelling, opinions' },
  ];
  // Rough fluency-timeline estimate: ~1500 "learning minutes" to conversational.
  const weeksToConversational = Math.max(4, Math.ceil(1500 / Math.max(1, minutes * 7)));
  return {
    startLevel,
    estimatedWeeksToConversational: weeksToConversational,
    stages: stages.map((s) => ({
      ...s,
      status: s.level < startLevel ? 'skipped' : s.level === startLevel ? 'current' : 'locked',
    })),
  };
}

// ---------------------------------------------------------------- profile
const mapProfile = (p) => ({
  nativeLanguage: p.native_language,
  targetLanguage: p.target_language,
  proficiency: p.proficiency,
  goal: p.goal,
  dailyMinutes: p.daily_minutes,
  pace: p.pace,
  accent: p.accent,
  voice: p.voice,
  ageGroup: p.age_group,
  interests: p.interests || [],
  roadmap: p.roadmap || null,
});

async function getActiveLanguage(userId) {
  const [rows] = await pool.query(
    'SELECT target_language FROM lingo_profiles WHERE user_id = ? ORDER BY is_active DESC, updated_at DESC LIMIT 1',
    [userId]
  );
  return rows[0] ? rows[0].target_language : null;
}

// Returns the learner's ACTIVE language profile (or null if none started).
const getProfile = async (userId) => {
  await ensureSchema();
  const [rows] = await pool.query(
    'SELECT * FROM lingo_profiles WHERE user_id = ? ORDER BY is_active DESC, updated_at DESC LIMIT 1',
    [userId]
  );
  if (rows.length === 0) return { success: true, data: null };
  return { success: true, data: mapProfile(rows[0]) };
};

// All languages the learner has started, with per-language progress summary.
const getLanguages = async (userId) => {
  await ensureSchema();
  const [rows] = await pool.query(
    `SELECT p.target_language AS targetLanguage, p.native_language AS nativeLanguage,
            p.proficiency, p.is_active AS isActive,
            DATE_FORMAT(p.created_at, '%Y-%m-%d') AS startedAt,
            COALESCE(s.xp, 0) AS xp, COALESCE(s.level, 1) AS level,
            COALESCE(s.current_streak, 0) AS currentStreak,
            COALESCE(s.vocab_learned, 0) AS vocabLearned,
            DATE_FORMAT(s.last_activity_date, '%Y-%m-%d') AS lastActivity
       FROM lingo_profiles p
       LEFT JOIN lingo_progress_stats s
         ON s.user_id = p.user_id AND s.target_language = p.target_language
      WHERE p.user_id = ?
      ORDER BY p.is_active DESC, p.updated_at DESC`,
    [userId]
  );
  return { success: true, data: rows.map((r) => ({ ...r, isActive: !!r.isActive })) };
};

// Make an already-started language the active one.
const switchLanguage = async (userId, targetLanguage) => {
  await ensureSchema();
  const lang = (targetLanguage || '').trim();
  const [exists] = await pool.query(
    'SELECT id FROM lingo_profiles WHERE user_id = ? AND target_language = ?',
    [userId, lang]
  );
  if (exists.length === 0) return { success: false, status: 404, message: 'You have not started that language yet' };
  await pool.query('UPDATE lingo_profiles SET is_active = (target_language = ?) WHERE user_id = ?', [lang, userId]);
  await pool.query('INSERT IGNORE INTO lingo_progress_stats (user_id, target_language) VALUES (?, ?)', [userId, lang]);
  return { success: true, message: 'Language switched', data: { targetLanguage: lang } };
};

const upsertProfile = async (userId, body) => {
  await ensureSchema();
  const targetLanguage = (body.targetLanguage || '').trim();
  if (!targetLanguage) return { success: false, status: 400, message: 'Target language is required' };

  const row = {
    native_language: body.nativeLanguage || null,
    target_language: targetLanguage,
    proficiency: body.proficiency || 'beginner',
    goal: body.goal || null,
    daily_minutes: Number(body.dailyMinutes) || 10,
    pace: body.pace || 'balanced',
    accent: body.accent || null,
    voice: body.voice || null,
    age_group: body.ageGroup || null,
    interests: JSON.stringify(Array.isArray(body.interests) ? body.interests : []),
  };
  const roadmap = buildRoadmap(row);

  // Only one language is active at a time — deactivate the others, then upsert
  // this (user, language) profile as the active one.
  await pool.query('UPDATE lingo_profiles SET is_active = 0 WHERE user_id = ?', [userId]);
  await pool.query(
    `INSERT INTO lingo_profiles
       (user_id, native_language, target_language, proficiency, goal, daily_minutes, pace, accent, voice, age_group, interests, roadmap, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
     ON DUPLICATE KEY UPDATE
       native_language = VALUES(native_language),
       proficiency = VALUES(proficiency),
       goal = VALUES(goal),
       daily_minutes = VALUES(daily_minutes),
       pace = VALUES(pace),
       accent = VALUES(accent),
       voice = VALUES(voice),
       age_group = VALUES(age_group),
       interests = VALUES(interests),
       roadmap = VALUES(roadmap),
       is_active = 1`,
    [userId, row.native_language, row.target_language, row.proficiency, row.goal, row.daily_minutes,
     row.pace, row.accent, row.voice, row.age_group, row.interests, JSON.stringify(roadmap)]
  );

  // Ensure a per-language stats row exists.
  await pool.query('INSERT IGNORE INTO lingo_progress_stats (user_id, target_language) VALUES (?, ?)', [userId, targetLanguage]);

  return { success: true, message: 'Profile saved', data: { roadmap } };
};

// ---------------------------------------------------------------- stats/dashboard
async function readStats(userId, lang) {
  const [rows] = await pool.query(
    'SELECT * FROM lingo_progress_stats WHERE user_id = ? AND target_language = ?',
    [userId, lang]
  );
  if (rows.length > 0) return rows[0];

  // No per-language row yet. Continuity: if this is the learner's first language
  // and they have legacy single-row lingo_stats progress, carry it over.
  let seed = { xp: 0, coins: 0, level: 1, current_streak: 0, longest_streak: 0, last_activity_date: null,
               vocab_learned: 0, pronunciation_score: 0, listening_score: 0, reading_score: 0, conversation_score: 0 };
  try {
    const [anyLang] = await pool.query('SELECT COUNT(*) AS c FROM lingo_progress_stats WHERE user_id = ?', [userId]);
    if (Number(anyLang[0].c) === 0) {
      const [old] = await pool.query('SELECT * FROM lingo_stats WHERE user_id = ?', [userId]);
      if (old.length) seed = old[0];
    }
  } catch (e) { /* legacy lingo_stats may not exist */ }

  await pool.query(
    `INSERT IGNORE INTO lingo_progress_stats
       (user_id, target_language, xp, coins, level, current_streak, longest_streak, last_activity_date,
        vocab_learned, pronunciation_score, listening_score, reading_score, conversation_score)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [userId, lang, seed.xp || 0, seed.coins || 0, seed.level || 1, seed.current_streak || 0, seed.longest_streak || 0,
     seed.last_activity_date || null, seed.vocab_learned || 0, seed.pronunciation_score || 0,
     seed.listening_score || 0, seed.reading_score || 0, seed.conversation_score || 0]
  );
  const [again] = await pool.query(
    'SELECT * FROM lingo_progress_stats WHERE user_id = ? AND target_language = ?',
    [userId, lang]
  );
  return again[0];
}

const getDashboard = async (userId) => {
  await ensureSchema();
  const [profileRows] = await pool.query(
    'SELECT target_language, daily_minutes, roadmap FROM lingo_profiles WHERE user_id = ? ORDER BY is_active DESC, updated_at DESC LIMIT 1',
    [userId]
  );
  const profile = profileRows[0] || null;
  const lang = profile ? profile.target_language : null;
  const stats = lang
    ? await readStats(userId, lang)
    : { xp: 0, coins: 0, level: 1, current_streak: 0, longest_streak: 0, vocab_learned: 0,
        pronunciation_score: 0, listening_score: 0, reading_score: 0, conversation_score: 0 };

  // Weak areas: lowest-mastery categories the learner has touched.
  let weakAreas = [];
  let dueReviews = 0;
  if (lang) {
    const [weak] = await pool.query(
      `SELECT v.category,
              ROUND(AVG(p.mastery_level) * 20) AS mastery
         FROM lingo_vocab_progress p
         JOIN lingo_vocabulary v ON v.id = p.vocab_id
        WHERE p.user_id = ? AND v.target_language = ?
        GROUP BY v.category
        ORDER BY mastery ASC
        LIMIT 3`,
      [userId, lang]
    );
    weakAreas = weak.map((w) => ({ category: w.category, mastery: Number(w.mastery) || 0 }));

    const [due] = await pool.query(
      `SELECT COUNT(*) AS c
         FROM lingo_vocab_progress p
         JOIN lingo_vocabulary v ON v.id = p.vocab_id
        WHERE p.user_id = ? AND v.target_language = ?
          AND p.next_review_at IS NOT NULL AND p.next_review_at <= NOW()`,
      [userId, lang]
    );
    dueReviews = Number(due[0].c) || 0;
  }

  const [todayRows] = await pool.query(
    `SELECT COALESCE(SUM(xp_earned),0) AS xpToday, COUNT(*) AS sessionsToday
       FROM lingo_activity
      WHERE user_id = ? AND DATE(created_at) = CURDATE()
        AND (? IS NULL OR target_language = ?)`,
    [userId, lang, lang]
  );

  const level = levelFromXp(stats.xp);
  const xpIntoLevel = stats.xp % LEVEL_XP;
  const unlock = await computeAccess(userId, lang, stats);
  const roadmap = applyUnlockToRoadmap(profile ? profile.roadmap : null, unlock);

  return {
    success: true,
    data: {
      hasProfile: !!profile,
      targetLanguage: lang,
      unlock,
      dailyGoalMinutes: profile ? profile.daily_minutes : 10,
      roadmap,
      stats: {
        xp: stats.xp,
        coins: stats.coins,
        level,
        xpIntoLevel,
        xpForNextLevel: LEVEL_XP,
        currentStreak: stats.current_streak,
        longestStreak: stats.longest_streak,
        vocabLearned: stats.vocab_learned,
        pronunciationScore: stats.pronunciation_score,
        listeningScore: stats.listening_score,
        readingScore: stats.reading_score,
        conversationScore: stats.conversation_score,
        xpToday: Number(todayRows[0].xpToday) || 0,
        sessionsToday: Number(todayRows[0].sessionsToday) || 0,
      },
      weakAreas,
      dueReviews,
    },
  };
};

// ---------------------------------------------------------------- content source
// The Vocabulary / Pronunciation / Listening labs read from lingo_vocabulary.
// Policy: use AI to CREATE content when it's available, else fall back to seeded
// data. So when a language is sparse and AI is reachable, we generate the default
// categories once and PERSIST them (stable vocab_ids for spaced repetition); if
// AI is unavailable we simply serve whatever has been seeded.
const DEFAULT_CATEGORIES = ['greetings', 'numbers', 'colors', 'food', 'family'];
const _ensuredLangs = new Set();

async function ensureLanguageContent(lang) {
  if (!lang || _ensuredLangs.has(lang)) return;

  const [cntRows] = await pool.query(
    'SELECT COUNT(*) AS c, COUNT(DISTINCT category) AS cats FROM lingo_vocabulary WHERE target_language = ?',
    [lang]
  );
  const total = Number(cntRows[0].c) || 0;
  const cats = Number(cntRows[0].cats) || 0;

  // Already has enough content → serve from the table (seed or prior AI fill).
  if (total >= 15 || cats >= 3) { _ensuredLangs.add(lang); return; }

  // Sparse. Only attempt AI generation if a key is configured; otherwise leave it
  // to whatever seed exists (do NOT mark ensured, so it retries once AI returns).
  if (!process.env.GEMINI_API_KEY) return;

  try {
    const seed = require('./lingo_seed_service'); // lazy require avoids a load cycle
    const results = await Promise.all(
      DEFAULT_CATEGORIES.map((c) => seed.generate({ language: lang, category: c, count: 8 }).catch(() => null))
    );
    const anyGenerated = results.some((r) => r && r.success && r.data && !r.data.aiUnavailable);
    if (anyGenerated) _ensuredLangs.add(lang); // AI worked — don't regenerate again
    // If AI was unavailable, stay un-ensured so we retry later; seed is used meanwhile.
  } catch {
    /* generation failed — seed content is still served */
  }
}

// ---------------------------------------------------------------- vocabulary
const getCategories = async (userId, lang) => {
  await ensureSchema();
  await ensureLanguageContent(lang);
  const [rows] = await pool.query(
    `SELECT v.category,
            COUNT(*) AS total,
            COALESCE(SUM(CASE WHEN p.mastery_level >= 4 THEN 1 ELSE 0 END), 0) AS mastered
       FROM lingo_vocabulary v
       LEFT JOIN lingo_vocab_progress p ON p.vocab_id = v.id AND p.user_id = ?
      WHERE v.target_language = ?
      GROUP BY v.category
      ORDER BY v.category`,
    [userId, lang]
  );
  return {
    success: true,
    data: rows.map((r) => ({
      category: r.category,
      total: Number(r.total),
      mastered: Number(r.mastered),
      progress: r.total > 0 ? Math.round((Number(r.mastered) / Number(r.total)) * 100) : 0,
    })),
  };
};

const getVocabulary = async (userId, lang, category) => {
  await ensureSchema();
  await ensureLanguageContent(lang);
  const params = [userId, lang];
  let where = 'v.target_language = ?';
  if (category) { where += ' AND v.category = ?'; params.push(category); }
  const [rows] = await pool.query(
    `SELECT v.*, p.mastery_level, p.times_seen, p.times_correct
       FROM lingo_vocabulary v
       LEFT JOIN lingo_vocab_progress p ON p.vocab_id = v.id AND p.user_id = ?
      WHERE ${where}
      ORDER BY v.category, v.difficulty, v.id`,
    params
  );
  return {
    success: true,
    data: rows.map((v) => ({
      id: v.id,
      word: v.word,
      translation: v.translation,
      ipa: v.ipa,
      exampleSentence: v.example_sentence,
      exampleTranslation: v.example_translation,
      imageUrl: v.image_url,
      category: v.category,
      difficulty: v.difficulty,
      masteryLevel: v.mastery_level || 0,
      timesSeen: v.times_seen || 0,
    })),
  };
};

const getReviewQueue = async (userId, lang) => {
  await ensureSchema();
  const [rows] = await pool.query(
    `SELECT v.*, p.mastery_level
       FROM lingo_vocab_progress p
       JOIN lingo_vocabulary v ON v.id = p.vocab_id
      WHERE p.user_id = ? AND v.target_language = ?
        AND p.next_review_at IS NOT NULL AND p.next_review_at <= NOW()
      ORDER BY p.next_review_at ASC
      LIMIT 20`,
    [userId, lang]
  );
  return {
    success: true,
    data: rows.map((v) => ({
      id: v.id, word: v.word, translation: v.translation, ipa: v.ipa,
      exampleSentence: v.example_sentence, exampleTranslation: v.example_translation,
      category: v.category, difficulty: v.difficulty, masteryLevel: v.mastery_level || 0,
    })),
  };
};

// ---------------------------------------------------------------- submit activity
// body: { activityType, category, items: [{ vocabId, correct, responseMs }] }
const submitActivity = async (userId, body) => {
  await ensureSchema();
  const activityType = (body.activityType || 'flashcards').slice(0, 40);
  const category = body.category || null;
  const items = Array.isArray(body.items) ? body.items : [];
  if (items.length === 0) return { success: false, status: 400, message: 'No activity items submitted' };

  // Resolve which language this activity counts toward (explicit > active > derived).
  let lang = (body.targetLanguage || '').trim();
  if (!lang) lang = await getActiveLanguage(userId);
  if (!lang) {
    const [vr] = await pool.query('SELECT target_language FROM lingo_vocabulary WHERE id = ? LIMIT 1', [parseInt(items[0].vocabId, 10)]);
    lang = vr[0] ? vr[0].target_language : null;
  }

  const now = new Date();
  let correctCount = 0;
  let scoreSum = 0; // for skill activities that carry a 0-100 per-item score
  const masteryUpdates = [];

  for (const item of items) {
    const vocabId = parseInt(item.vocabId, 10);
    if (Number.isNaN(vocabId)) continue;
    // Skill activities (pronunciation) send a 0-100 `score`; treat >= 70 as correct
    // when an explicit correct flag isn't provided.
    const hasScore = typeof item.score === 'number';
    const itemScore = hasScore ? Math.max(0, Math.min(100, Math.round(item.score))) : null;
    const correct = item.correct !== undefined ? !!item.correct : (itemScore !== null ? itemScore >= 70 : false);
    scoreSum += itemScore !== null ? itemScore : (correct ? 100 : 0);
    if (correct) correctCount += 1;

    const [existing] = await pool.query(
      'SELECT * FROM lingo_vocab_progress WHERE user_id = ? AND vocab_id = ?',
      [userId, vocabId]
    );
    let mastery, ease, interval;
    if (existing.length === 0) {
      mastery = correct ? 1 : 0;
      ease = 2.5;
      interval = correct ? 1 : 0;
    } else {
      const p = existing[0];
      ease = Number(p.ease_factor);
      mastery = p.mastery_level;
      interval = p.interval_days;
      if (correct) {
        mastery = Math.min(5, mastery + 1);
        ease = Math.min(3.0, ease + 0.1);
        interval = interval <= 0 ? 1 : interval === 1 ? 3 : Math.round(interval * ease);
      } else {
        mastery = Math.max(0, mastery - 1);
        ease = Math.max(1.3, ease - 0.2);
        interval = 1;
      }
    }
    const nextReview = new Date(now.getTime() + Math.max(1, interval) * 86400000);

    await pool.query(
      `INSERT INTO lingo_vocab_progress
         (user_id, vocab_id, times_seen, times_correct, times_wrong, mastery_level, ease_factor, interval_days, next_review_at, last_reviewed_at)
       VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         times_seen = times_seen + 1,
         times_correct = times_correct + VALUES(times_correct),
         times_wrong = times_wrong + VALUES(times_wrong),
         mastery_level = VALUES(mastery_level),
         ease_factor = VALUES(ease_factor),
         interval_days = VALUES(interval_days),
         next_review_at = VALUES(next_review_at),
         last_reviewed_at = VALUES(last_reviewed_at)`,
      [userId, vocabId, correct ? 1 : 0, correct ? 0 : 1, mastery, ease, interval, nextReview, now]
    );
    masteryUpdates.push({ vocabId, masteryLevel: mastery });
  }

  const total = items.length;
  const accuracy = Math.round((correctCount / total) * 100);
  const xpEarned = correctCount * 10 + (accuracy === 100 ? 5 : 0);
  const coinsEarned = Math.floor(xpEarned / 10);

  await pool.query(
    `INSERT INTO lingo_activity (user_id, activity_type, target_language, category, total, correct, accuracy, xp_earned)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [userId, activityType, lang, category, total, correctCount, accuracy, xpEarned]
  );

  const sessionScore = Math.round(scoreSum / total);

  // --- Per-language gamification stats (XP, coins, streak, vocab_learned). ---
  const stats = lang ? await readStats(userId, lang) : null;
  let newLevel = stats ? levelFromXp(stats.xp) : 1;
  let leveledUp = false;
  let currentStreak = stats ? stats.current_streak : 0;
  let vocabLearned = stats ? stats.vocab_learned : 0;

  if (stats && lang) {
    const today = todayStr();
    const last = stats.last_activity_date ? new Date(stats.last_activity_date).toISOString().slice(0, 10) : null;
    if (last === today) {
      // already counted today
    } else if (last && daysBetween(last, today) === 1) {
      currentStreak += 1;
    } else {
      currentStreak = 1;
    }
    const longestStreak = Math.max(stats.longest_streak, currentStreak);

    const [vlRows] = await pool.query(
      `SELECT COUNT(*) AS c
         FROM lingo_vocab_progress p
         JOIN lingo_vocabulary v ON v.id = p.vocab_id
        WHERE p.user_id = ? AND v.target_language = ? AND p.mastery_level >= 4`,
      [userId, lang]
    );
    vocabLearned = Number(vlRows[0].c) || 0;
    const newXp = stats.xp + xpEarned;
    newLevel = levelFromXp(newXp);
    leveledUp = newLevel > levelFromXp(stats.xp);

    await pool.query(
      `UPDATE lingo_progress_stats
          SET xp = ?, coins = coins + ?, level = ?, current_streak = ?, longest_streak = ?,
              last_activity_date = ?, vocab_learned = ?
        WHERE user_id = ? AND target_language = ?`,
      [newXp, coinsEarned, newLevel, currentStreak, longestStreak, today, vocabLearned, userId, lang]
    );

    // Skill scores (rolling average) for pronunciation / listening / etc.
    const SCORE_COLUMN = {
      pronunciation: 'pronunciation_score',
      listening: 'listening_score',
      reading: 'reading_score',
      conversation: 'conversation_score',
    };
    const scoreCol = SCORE_COLUMN[activityType]; // fixed whitelist -> safe to interpolate
    if (scoreCol) {
      const oldScore = Number(stats[scoreCol]) || 0;
      const newScore = oldScore === 0 ? sessionScore : Math.round(oldScore * 0.6 + sessionScore * 0.4);
      await pool.query(
        `UPDATE lingo_progress_stats SET ${scoreCol} = ? WHERE user_id = ? AND target_language = ?`,
        [newScore, userId, lang]
      );
    }
  }

  return {
    success: true,
    data: {
      total, correct: correctCount, accuracy, score: sessionScore, xpEarned, coinsEarned,
      level: newLevel, leveledUp, currentStreak, vocabLearned, masteryUpdates,
    },
  };
};

// Award XP / streak / optional skill score for non-vocab activities (e.g. the
// conversation lab). Centralizes the streak + level logic so other Lingo Lab
// services don't duplicate it.
const awardXp = async (userId, lang, xp, opts = {}) => {
  await ensureSchema();
  if (!lang) return null;
  const stats = await readStats(userId, lang);
  const today = todayStr();
  let currentStreak = stats.current_streak;
  const last = stats.last_activity_date ? new Date(stats.last_activity_date).toISOString().slice(0, 10) : null;
  if (last === today) {
    // already counted today
  } else if (last && daysBetween(last, today) === 1) {
    currentStreak += 1;
  } else {
    currentStreak = 1;
  }
  const longestStreak = Math.max(stats.longest_streak, currentStreak);
  const gained = Number(xp) || 0;
  const newXp = stats.xp + gained;
  const newLevel = levelFromXp(newXp);
  const leveledUp = newLevel > levelFromXp(stats.xp);
  const coinsEarned = Math.floor(gained / 10);

  await pool.query(
    `UPDATE lingo_progress_stats
        SET xp = ?, coins = coins + ?, level = ?, current_streak = ?, longest_streak = ?, last_activity_date = ?
      WHERE user_id = ? AND target_language = ?`,
    [newXp, coinsEarned, newLevel, currentStreak, longestStreak, today, userId, lang]
  );

  // Optional skill-score update (rolling average). Accepts the legacy
  // `conversationScore` shorthand or a generic { scoreField, score }.
  const SCORE_FIELDS = new Set(['pronunciation_score', 'listening_score', 'reading_score', 'conversation_score']);
  let scoreField = null;
  let scoreVal = null;
  if (typeof opts.conversationScore === 'number') { scoreField = 'conversation_score'; scoreVal = opts.conversationScore; }
  else if (opts.scoreField && typeof opts.score === 'number') { scoreField = opts.scoreField; scoreVal = opts.score; }
  if (scoreField && SCORE_FIELDS.has(scoreField)) {
    const sc = Math.max(0, Math.min(100, Math.round(scoreVal)));
    const oldScore = Number(stats[scoreField]) || 0;
    const newScore = oldScore === 0 ? sc : Math.round(oldScore * 0.6 + sc * 0.4);
    await pool.query(
      `UPDATE lingo_progress_stats SET ${scoreField} = ? WHERE user_id = ? AND target_language = ?`,
      [newScore, userId, lang]
    );
  }

  return { xp: newXp, level: newLevel, leveledUp, currentStreak };
};

// ---------------------------------------------------------------- settings / access
const LAB_TABS = ['vocabulary', 'pronunciation', 'listening', 'sentence', 'reading', 'conversation', 'voice', 'roleplay', 'fluency'];

const getSettings = async () => {
  await ensureSchema();
  const [rows] = await pool.query('SELECT unlock_mode FROM lingo_settings WHERE id = 1');
  const unlockMode = rows[0] && rows[0].unlock_mode === 'all' ? 'all' : 'progressive';
  return { success: true, data: { unlockMode } };
};

const setSettings = async (unlockMode, actorUuid) => {
  await ensureSchema();
  const mode = unlockMode === 'all' ? 'all' : 'progressive';
  await pool.query(
    `INSERT INTO lingo_settings (id, unlock_mode, updated_by) VALUES (1, ?, ?)
       ON DUPLICATE KEY UPDATE unlock_mode = VALUES(unlock_mode), updated_by = VALUES(updated_by)`,
    [mode, actorUuid || null]
  );
  return { success: true, data: { unlockMode: mode } };
};

// Map each roadmap stage to the lab tab that gates it (sentence/reading labs are
// not built yet, so they follow the last implemented lab, 'listening').
const STAGE_TAB = {
  vocabulary: 'vocabulary', pronunciation: 'pronunciation', listening: 'listening',
  sentence: 'sentence', reading: 'reading', text_chat: 'conversation',
  voice_chat: 'voice', roleplay: 'roleplay', fluency: 'fluency',
};

// Recompute the roadmap stage statuses from the live unlock state so the
// dashboard roadmap matches the admin policy + the learner's progress.
function applyUnlockToRoadmap(roadmap, unlock) {
  let rm = roadmap;
  if (typeof rm === 'string') { try { rm = JSON.parse(rm); } catch { return roadmap; } }
  if (!rm || !Array.isArray(rm.stages)) return rm;
  const unlockedSet = new Set(unlock.unlockedTabs || []);
  const all = unlock.mode === 'all';
  let currentAssigned = false;
  const stages = rm.stages.map((s) => {
    if (s.key === 'onboarding') return { ...s, status: 'done' };
    const tab = STAGE_TAB[s.key];
    const unlocked = all || (tab && unlockedSet.has(tab));
    if (!unlocked) return { ...s, status: 'locked' };
    if (!currentAssigned) { currentAssigned = true; return { ...s, status: 'current' }; }
    return { ...s, status: 'unlocked' };
  });
  return { ...rm, stages };
}

// Which lab tabs are unlocked for this learner, given the admin policy + progress.
async function computeAccess(userId, lang, stats) {
  const settings = await getSettings();
  const mode = settings.data.unlockMode;
  if (mode === 'all' || !lang) return { mode, unlockedTabs: LAB_TABS.slice() };

  let hasVocab = (Number(stats.vocab_learned) || 0) > 0;
  if (!hasVocab) {
    try {
      const [a] = await pool.query(
        "SELECT 1 FROM lingo_activity WHERE user_id = ? AND target_language = ? AND activity_type IN ('vocabulary','flashcards') LIMIT 1",
        [userId, lang]
      );
      hasVocab = a.length > 0;
    } catch { /* table may be empty */ }
  }
  const hasPron = (Number(stats.pronunciation_score) || 0) > 0;
  const hasListen = (Number(stats.listening_score) || 0) > 0;

  let hasSentence = false;
  let hasReading = (Number(stats.reading_score) || 0) > 0;
  try {
    const [sr] = await pool.query(
      "SELECT DISTINCT activity_type FROM lingo_activity WHERE user_id = ? AND target_language = ? AND activity_type IN ('sentence','reading')",
      [userId, lang]
    );
    hasSentence = sr.some((r) => r.activity_type === 'sentence');
    hasReading = hasReading || sr.some((r) => r.activity_type === 'reading');
  } catch { /* table may be empty */ }

  let hasConversation = false;
  let hasRoleplay = false;
  try {
    const [c] = await pool.query('SELECT scenario FROM lingo_conversations WHERE user_id = ? AND target_language = ?', [userId, lang]);
    hasConversation = c.length > 0;
    hasRoleplay = c.some((r) => String(r.scenario || '').startsWith('rp_'));
  } catch { /* conversation tables may not exist yet */ }

  const unlocked = ['vocabulary'];
  if (hasVocab) unlocked.push('pronunciation');
  if (hasPron) unlocked.push('listening');
  if (hasListen) unlocked.push('sentence');
  if (hasSentence) unlocked.push('reading');
  if (hasReading) unlocked.push('conversation');
  if (hasConversation) unlocked.push('voice', 'roleplay');
  if (hasRoleplay) unlocked.push('fluency');
  return { mode, unlockedTabs: unlocked };
}

module.exports = {
  LINGO_SCHEMA_SQL,
  ensureSchema,
  getSettings,
  setSettings,
  getProfile,
  upsertProfile,
  getLanguages,
  switchLanguage,
  getActiveLanguage,
  getDashboard,
  getCategories,
  getVocabulary,
  getReviewQueue,
  submitActivity,
  awardXp,
};
