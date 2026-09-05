const { promisePool: pool } = require('../../config/db');

/**
 * Lingo Lab text-to-speech — ElevenLabs multilingual voices for word/phrase
 * playback. Returns base64 mp3 the browser plays; on any failure (no key, API
 * error) returns null so the frontend falls back to the free browser voice.
 * The multilingual model auto-detects the language from the text, so no explicit
 * language param is needed.
 */

const ELEVEN_URL = 'https://api.elevenlabs.io/v1/text-to-speech';
const ELEVEN_MODEL = 'eleven_multilingual_v2';
// Premade voices usable on the free tier.
const FEMALE_VOICE = 'Xb7hH8MSUJpSbSDYk0k2'; // "Alice" — clear educator
const MALE_VOICE = 'TxGEqnHWrfWFTfGW9XjX';   // "Josh"

async function getVoicePref(userId) {
  try {
    const [rows] = await pool.query(
      'SELECT voice FROM lingo_profiles WHERE user_id = ? ORDER BY is_active DESC, updated_at DESC LIMIT 1',
      [userId]
    );
    return rows[0] && rows[0].voice ? String(rows[0].voice).toLowerCase() : 'female';
  } catch {
    return 'female';
  }
}

function voiceIdFor(gender) {
  if (process.env.ELEVENLABS_VOICE_ID) return process.env.ELEVENLABS_VOICE_ID;
  return gender === 'male' ? MALE_VOICE : FEMALE_VOICE;
}

/**
 * Synthesize `text` to base64 mp3. Returns { ok, audio } or { ok:false }.
 */
async function synthesize(text, gender) {
  const clean = String(text || '').trim();
  if (!clean) return { ok: false };
  if (!process.env.ELEVENLABS_API_KEY) return { ok: false };

  try {
    const voiceId = voiceIdFor(gender);
    const res = await fetch(`${ELEVEN_URL}/${voiceId}?output_format=mp3_44100_128`, {
      method: 'POST',
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text: clean,
        model_id: ELEVEN_MODEL,
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    });
    if (!res.ok) {
      console.warn(`⚠️  Lingo TTS ElevenLabs failed (${res.status})`);
      return { ok: false };
    }
    const arrayBuf = await res.arrayBuffer();
    const buf = Buffer.from(arrayBuf);
    if (buf.length < 256) return { ok: false };
    return { ok: true, audio: buf.toString('base64'), mime: 'audio/mpeg' };
  } catch (err) {
    console.warn('⚠️  Lingo TTS error:', err.message);
    return { ok: false };
  }
}

const synthesizeForUser = async (userId, text) => {
  const gender = await getVoicePref(userId);
  return synthesize(text, gender);
};

module.exports = { synthesize, synthesizeForUser };
