/**
 * Narration voice for Byte Video.
 *   1. ElevenLabs (with-timestamps) — natural voice + per-character timing for
 *      word-perfect subtitles. Needs `ELEVENLABS_API_KEY`. Voice is chosen per
 *      call (opts.voiceId) or via `ELEVENLABS_VOICE_ID`, else a free-tier default.
 *   2. node-gtts — keyless fallback (robotic, no timings).
 *
 * synthesizeSpeech(text, destPath, opts) -> { ok, words } where `words` is
 * [{ word, start, end }] from ElevenLabs, or null (proportional timing is used
 * downstream). Writes an mp3 to destPath. Uses global `fetch`.
 */
const fs = require('fs');

const ELEVEN_URL = 'https://api.elevenlabs.io/v1/text-to-speech';
// "Alice – Clear, Engaging Educator" — a premade voice usable on the free tier.
const DEFAULT_VOICE = 'Xb7hH8MSUJpSbSDYk0k2';
const ELEVEN_MODEL = 'eleven_multilingual_v2';

/** Group per-character alignment into word timings. */
function wordsFromAlignment(al) {
  if (!al || !Array.isArray(al.characters)) return null;
  const chars = al.characters;
  const st = al.character_start_times_seconds || [];
  const en = al.character_end_times_seconds || [];
  const words = [];
  let cur = '', start = null, end = null;
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    if (/\s/.test(c)) {
      if (cur) { words.push({ word: cur, start, end }); cur = ''; start = null; }
      continue;
    }
    if (start === null) start = st[i];
    cur += c;
    end = en[i];
  }
  if (cur) words.push({ word: cur, start, end });
  return words.length ? words : null;
}

async function fromElevenLabs(text, destPath, voiceId) {
  if (!process.env.ELEVENLABS_API_KEY) return null;
  try {
    const vid = voiceId || process.env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE;
    const res = await fetch(`${ELEVEN_URL}/${vid}/with-timestamps?output_format=mp3_44100_128`, {
      method: 'POST',
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        text,
        model_id: ELEVEN_MODEL,
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    });
    if (!res.ok) {
      console.warn(`⚠️  ElevenLabs TTS failed (${res.status}); falling back to free voice`);
      return null;
    }
    const data = await res.json();
    if (!data.audio_base64) return null;
    const buf = Buffer.from(data.audio_base64, 'base64');
    if (buf.length < 512) return null;
    fs.writeFileSync(destPath, buf);
    return { words: wordsFromAlignment(data.alignment || data.normalized_alignment) };
  } catch (err) {
    console.warn('⚠️  ElevenLabs TTS error:', err.message);
    return null;
  }
}

function fromGtts(text, destPath) {
  return new Promise((resolve) => {
    try {
      const gtts = require('node-gtts')('en');
      gtts.save(destPath, text, (err) => resolve(!err));
    } catch (_) {
      resolve(false);
    }
  });
}

let _voicesCache = null;

/** List selectable narration voices (ElevenLabs premade, free-tier usable). */
async function listVoices() {
  if (_voicesCache) return _voicesCache;
  const fallback = [{ id: DEFAULT_VOICE, name: 'Alice (Educator)', description: 'Clear, engaging', gender: 'female', previewUrl: null }];
  if (!process.env.ELEVENLABS_API_KEY) return fallback;
  try {
    const res = await fetch('https://api.elevenlabs.io/v1/voices', { headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY } });
    if (!res.ok) return fallback;
    const data = await res.json();
    const all = Array.isArray(data.voices) ? data.voices : [];
    const premade = all.filter((v) => v.category === 'premade' || v.category === 'default');
    const list = (premade.length ? premade : all).map((v) => ({
      id: v.voice_id,
      name: (v.name || '').trim(),
      description: v.labels ? Object.values(v.labels).filter(Boolean).join(', ') : '',
      gender: (v.labels && v.labels.gender) || null,
      previewUrl: v.preview_url || null,
    }));
    _voicesCache = list.length ? list : fallback;
    return _voicesCache;
  } catch (_) {
    return fallback;
  }
}

/** Synthesize `text` to `destPath` (mp3). Returns { ok, words }. */
async function synthesizeSpeech(text, destPath, opts = {}) {
  if (!text) return { ok: false, words: null };
  const el = await fromElevenLabs(text, destPath, opts.voiceId);
  if (el) return { ok: true, words: el.words };
  if (await fromGtts(text, destPath)) return { ok: true, words: null };
  return { ok: false, words: null };
}

module.exports = { synthesizeSpeech, listVoices, DEFAULT_VOICE };
