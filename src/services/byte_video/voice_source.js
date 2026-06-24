/**
 * Narration voice for Byte Video.
 *   1. ElevenLabs — natural, human-like voice; needs `ELEVENLABS_API_KEY`
 *      (free tier available). Optional `ELEVENLABS_VOICE_ID`.
 *   2. node-gtts   — keyless fallback (robotic), so narration always works.
 *
 * Writes an mp3 to `destPath`; returns true on success. Uses global `fetch`.
 */
const fs = require('fs');

const ELEVEN_URL = 'https://api.elevenlabs.io/v1/text-to-speech';
// "Alice – Clear, Engaging Educator" — a premade voice usable on the free tier
// (free accounts cannot use "library" voices like Rachel via the API).
const DEFAULT_VOICE = 'Xb7hH8MSUJpSbSDYk0k2';
const ELEVEN_MODEL = 'eleven_multilingual_v2';

async function fromElevenLabs(text, destPath) {
  if (!process.env.ELEVENLABS_API_KEY) return false;
  try {
    const voiceId = process.env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE;
    const res = await fetch(`${ELEVEN_URL}/${voiceId}?output_format=mp3_44100_128`, {
      method: 'POST',
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: ELEVEN_MODEL,
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    });
    if (!res.ok) {
      console.warn(`⚠️  ElevenLabs TTS failed (${res.status}); falling back to free voice`);
      return false;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 512) return false;
    fs.writeFileSync(destPath, buf);
    return true;
  } catch (err) {
    console.warn('⚠️  ElevenLabs TTS error:', err.message);
    return false;
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

/** Synthesize `text` to `destPath` (mp3). ElevenLabs if configured, else gTTS. */
async function synthesizeSpeech(text, destPath) {
  if (!text) return false;
  if (await fromElevenLabs(text, destPath)) return true;
  if (await fromGtts(text, destPath)) return true;
  return false;
}

module.exports = { synthesizeSpeech };
