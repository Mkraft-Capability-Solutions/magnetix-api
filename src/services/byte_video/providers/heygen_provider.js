/**
 * "heygen" Byte Video provider — AI presenter (avatar) videos via the HeyGen
 * API. A realistic avatar reads the script on screen; HeyGen renders + voices
 * it. This is the highest-fidelity / most "course-like" option.
 *
 * Flow: build narration (Gemini script, or the raw command if Gemini is
 * unavailable) -> POST /v2/video/generate -> poll /v1/video_status.get ->
 * download the finished mp4 -> ffmpeg thumbnail.
 *
 * Requires `HEYGEN_API_KEY` with **API credits** on the account. Optional
 * `HEYGEN_AVATAR_ID` / `HEYGEN_VOICE_ID` (sensible defaults below).
 */
const path = require('path');
const fs = require('fs');
const geminiAIService = require('../../gemini/gemini_ai_service');
const ff = require('../ffmpeg_util');

const name = 'heygen';

const GENERATE_URL = 'https://api.heygen.com/v2/video/generate';
const STATUS_URL = 'https://api.heygen.com/v1/video_status.get';
const DEFAULT_AVATAR = 'Abigail_expressive_2024112501';
const DEFAULT_VOICE = 'f8c69e517f424cafaecde32dde57096b';

// Poll cadence / ceiling (avatar renders typically finish in 1-5 min).
const POLL_INTERVAL_MS = 10000;
const MAX_POLLS = 90; // ~15 min
// Keep narration bounded so a single clip stays short (and cheap).
const MAX_SCRIPT_CHARS = 800;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Build the spoken script. Uses Gemini if available, else the raw command. */
async function buildNarration(command) {
  try {
    const script = await geminiAIService.generateVideoScript(command);
    const text = script.scenes.map((s) => s.narration).filter(Boolean).join(' ');
    return { title: script.title, text: (text || command).slice(0, MAX_SCRIPT_CHARS), scriptJson: script };
  } catch (err) {
    console.warn('⚠️  HeyGen: Gemini script unavailable, using the command as the script:', err.message);
    return { title: command.slice(0, 80), text: command.slice(0, MAX_SCRIPT_CHARS), scriptJson: null };
  }
}

function headers() {
  return {
    'X-Api-Key': process.env.HEYGEN_API_KEY,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
}

async function createVideo(text) {
  const body = {
    video_inputs: [
      {
        character: {
          type: 'avatar',
          avatar_id: process.env.HEYGEN_AVATAR_ID || DEFAULT_AVATAR,
          avatar_style: 'normal',
        },
        voice: {
          type: 'text',
          input_text: text,
          voice_id: process.env.HEYGEN_VOICE_ID || DEFAULT_VOICE,
        },
        background: { type: 'color', value: '#0f172a' },
      },
    ],
    dimension: { width: 1280, height: 720 },
  };

  const res = await fetch(GENERATE_URL, { method: 'POST', headers: headers(), body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  if (json.error || !json?.data?.video_id) {
    const msg = json?.error?.message || json?.message || `HTTP ${res.status}`;
    throw new Error(`HeyGen generate failed: ${msg}`);
  }
  return json.data.video_id;
}

async function pollVideo(videoId) {
  for (let i = 0; i < MAX_POLLS; i++) {
    await sleep(POLL_INTERVAL_MS);
    const res = await fetch(`${STATUS_URL}?video_id=${videoId}`, { headers: headers() });
    const json = await res.json().catch(() => ({}));
    const status = json?.data?.status;
    if (status === 'completed') {
      return { url: json.data.video_url, duration: json.data.duration };
    }
    if (status === 'failed') {
      const err = json?.data?.error || {};
      throw new Error(`HeyGen render failed: ${err.message || err.detail || 'unknown error'}`);
    }
  }
  throw new Error('HeyGen render timed out');
}

async function downloadTo(url, destPath) {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`HeyGen download failed: HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(destPath, buf);
}

async function generate(job) {
  if (!process.env.HEYGEN_API_KEY) {
    throw new Error('HEYGEN_API_KEY is not configured');
  }

  const narration = await buildNarration(job.command);

  const videoId = await createVideo(narration.text);
  console.log(`🎬 HeyGen video submitted (${videoId}); polling…`);
  const { url, duration } = await pollVideo(videoId);

  ff.ensureDir(ff.BYTE_VIDEO_DIR);
  const base = `${Date.now()}`;
  const outputFilename = `${base}.mp4`;
  const thumbnailFilename = `${base}.jpg`;
  const outputPath = path.join(ff.BYTE_VIDEO_DIR, outputFilename);

  await downloadTo(url, outputPath);

  let finalThumb = null;
  try {
    await ff.makeThumbnail(outputPath, path.join(ff.BYTE_VIDEO_DIR, thumbnailFilename));
    finalThumb = thumbnailFilename;
  } catch (_) { /* optional */ }

  const probed = await ff.probeDurationSeconds(outputPath);

  return {
    title: narration.title,
    scriptJson: narration.scriptJson || { title: narration.title, scenes: [{ caption: narration.title, narration: narration.text }] },
    outputFilename,
    thumbnailFilename: finalThumb,
    durationSeconds: probed || Math.round(duration) || null,
  };
}

module.exports = { name, generate };
