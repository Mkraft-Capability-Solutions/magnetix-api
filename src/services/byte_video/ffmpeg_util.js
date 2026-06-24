/**
 * ffmpeg helpers for Byte Video generation.
 *
 * Uses the binary bundled by `ffmpeg-static` so no system ffmpeg install is
 * required (the host here has none). All rendering primitives used by the
 * "explainer" provider live here: caption slides, per-scene clips, concat,
 * and a poster thumbnail. Everything is defensive — a missing font just means
 * slides render without captions; missing audio means silent scenes.
 */
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execFile } = require('child_process');
const ffmpegPath = require('ffmpeg-static');

// uploads/byte_videos lives at the magnetix-api root (this file is 3 dirs deep).
const BYTE_VIDEO_DIR = path.join(__dirname, '../../../uploads/byte_videos');
const LESSON_MP4_DIR = path.join(__dirname, '../../../uploads/courses/lessons/mp4');

// Candidate caption fonts (macOS dev + common Linux prod). Overridable via env.
const FONT_CANDIDATES = [
  process.env.BYTE_VIDEO_FONT,
  '/System/Library/Fonts/Supplemental/Arial.ttf',
  '/System/Library/Fonts/Supplemental/Verdana.ttf',
  '/Library/Fonts/Arial.ttf',
  '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
  '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf',
  '/usr/share/fonts/TTF/DejaVuSans.ttf',
].filter(Boolean);

const WIDTH = 1280;
const HEIGHT = 720;
const BG_COLOR = '0x0f172a'; // slate-900
const FRAME_RATE = 25;

function findFont() {
  for (const f of FONT_CANDIDATES) {
    try {
      if (fs.existsSync(f)) return f;
    } catch (_) { /* ignore */ }
  }
  return null;
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

/** Run the bundled ffmpeg with the given args; resolves on exit code 0. */
function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    execFile(ffmpegPath, ['-y', '-hide_banner', '-loglevel', 'error', ...args], { maxBuffer: 1024 * 1024 * 32 }, (err, stdout, stderr) => {
      if (err) {
        reject(new Error(`ffmpeg failed: ${stderr || err.message}`));
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

/** Word-wrap caption text to fit the slide; returns at most `maxLines` lines. */
function wrapCaption(text, maxCharsPerLine = 26, maxLines = 6) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';
  for (const word of words) {
    if ((current + ' ' + word).trim().length > maxCharsPerLine && current) {
      lines.push(current);
      current = word;
    } else {
      current = (current + ' ' + word).trim();
    }
    if (lines.length >= maxLines) break;
  }
  if (current && lines.length < maxLines) lines.push(current);
  return lines.slice(0, maxLines).join('\n');
}

/**
 * Render a single caption slide PNG. If no usable font is found, produces a
 * plain colored slide (the narration still carries the content).
 */
async function makeSlide(caption, outPng, workDir) {
  const font = findFont();
  const colorInput = `color=c=${BG_COLOR}:s=${WIDTH}x${HEIGHT}`;

  if (!font || !caption) {
    await runFfmpeg(['-f', 'lavfi', '-i', colorInput, '-frames:v', '1', outPng]);
    return;
  }

  const capFile = path.join(workDir, `cap_${path.basename(outPng)}.txt`);
  fs.writeFileSync(capFile, wrapCaption(caption), 'utf8');

  const vf = [
    `drawtext=fontfile='${font}'`,
    `textfile='${capFile}'`,
    'fontcolor=white',
    'fontsize=56',
    'line_spacing=18',
    'x=(w-text_w)/2',
    'y=(h-text_h)/2',
  ].join(':');

  await runFfmpeg(['-f', 'lavfi', '-i', colorInput, '-vf', vf, '-frames:v', '1', outPng]);
}

/** Scene clip from a slide + narration mp3 (duration follows the audio). */
async function makeSceneWithAudio(slidePng, audioPath, outMp4) {
  await runFfmpeg([
    '-loop', '1', '-i', slidePng,
    '-i', audioPath,
    '-c:v', 'libx264', '-tune', 'stillimage', '-pix_fmt', 'yuv420p', '-r', String(FRAME_RATE),
    '-c:a', 'aac', '-b:a', '192k', '-ar', '44100',
    '-shortest', outMp4,
  ]);
}

/** Silent scene clip from a slide held for `seconds` (TTS-unavailable fallback). */
async function makeSilentScene(slidePng, seconds, outMp4) {
  const dur = Math.max(2, Math.round(seconds));
  await runFfmpeg([
    '-loop', '1', '-t', String(dur), '-i', slidePng,
    '-f', 'lavfi', '-t', String(dur), '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100',
    '-c:v', 'libx264', '-tune', 'stillimage', '-pix_fmt', 'yuv420p', '-r', String(FRAME_RATE),
    '-c:a', 'aac', '-b:a', '192k',
    '-shortest', outMp4,
  ]);
}

/**
 * Scene clip built from a real photo with a slow Ken Burns zoom and a caption
 * band near the bottom. `seconds` drives the clip length; pass the probed
 * narration duration for audio scenes, or an estimate for silent ones.
 * `audioPath` null => silent scene.
 */
async function makeImageScene(imagePath, caption, audioPath, seconds, outMp4, workDir) {
  const dur = Math.max(2, Math.round(seconds));
  const frames = Math.max(2, Math.round(dur * FRAME_RATE));
  const font = findFont();

  // Pre-scale large to keep the zoom smooth, then slow zoom-in to 1.25x.
  let vf =
    `scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,` +
    `zoompan=z='min(zoom+0.0004,1.25)':d=${frames}:` +
    `x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${WIDTH}x${HEIGHT}:fps=${FRAME_RATE}`;

  if (font && caption) {
    const capFile = path.join(workDir, `cap_${path.basename(outMp4)}.txt`);
    fs.writeFileSync(capFile, wrapCaption(caption, 34, 3), 'utf8');
    vf +=
      `,drawtext=fontfile='${font}':textfile='${capFile}':fontcolor=white:fontsize=46:` +
      `box=1:boxcolor=black@0.55:boxborderw=22:x=(w-text_w)/2:y=h-text_h-70:line_spacing=12`;
  }

  const common = [
    '-filter_complex', `[0:v]${vf}[v]`,
    '-map', '[v]', '-map', '1:a',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-r', String(FRAME_RATE),
    '-c:a', 'aac', '-b:a', '192k',
    '-shortest', outMp4,
  ];

  if (audioPath) {
    await runFfmpeg(['-loop', '1', '-i', imagePath, '-i', audioPath, '-ar', '44100', ...common]);
  } else {
    await runFfmpeg([
      '-loop', '1', '-i', imagePath,
      '-f', 'lavfi', '-t', String(dur), '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100',
      ...common,
    ]);
  }
}

/** Concatenate scene mp4s (uniform codecs) into one mp4. */
async function concatScenes(sceneMp4s, outMp4, workDir) {
  const listFile = path.join(workDir, 'concat_list.txt');
  fs.writeFileSync(listFile, sceneMp4s.map((p) => `file '${p}'`).join('\n'), 'utf8');
  await runFfmpeg(['-f', 'concat', '-safe', '0', '-i', listFile, '-c', 'copy', outMp4]);
}

/** Single-shot solid-color clip with a centered caption (used by the stub). */
async function makePlaceholderClip(caption, seconds, outMp4, workDir) {
  const slide = path.join(workDir, 'placeholder_slide.png');
  await makeSlide(caption, slide, workDir);
  await makeSilentScene(slide, seconds, outMp4);
}

/** Grab a poster thumbnail (~1s in) from a finished mp4. */
async function makeThumbnail(mp4Path, outImg) {
  await runFfmpeg(['-ss', '00:00:01', '-i', mp4Path, '-frames:v', '1', outImg]);
}

/**
 * Probe a media file's duration in seconds. ffmpeg-static ships no ffprobe, so
 * we run `ffmpeg -i <file>` and parse the "Duration: HH:MM:SS.ss" line from
 * stderr. Returns null if it can't be determined.
 */
function probeDurationSeconds(filePath) {
  return new Promise((resolve) => {
    execFile(ffmpegPath, ['-hide_banner', '-i', filePath], (err, stdout, stderr) => {
      const text = `${stderr || ''}`;
      const m = text.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
      if (!m) return resolve(null);
      const seconds = Number(m[1]) * 3600 + Number(m[2]) * 60 + parseFloat(m[3]);
      resolve(Number.isFinite(seconds) ? Math.round(seconds) : null);
    });
  });
}

/** Format seconds as a "M:SS" duration string (e.g. 51 -> "0:51", 75 -> "1:15"). */
function formatDuration(seconds) {
  if (!seconds || seconds < 0) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * Place `src` at `dest` without duplicating bytes on disk: try a hard link
 * (same inode, shared data) and fall back to a real copy across filesystems.
 */
function linkOrCopyFile(src, dest) {
  try {
    fs.linkSync(src, dest);
  } catch (err) {
    fs.copyFileSync(src, dest);
  }
}

module.exports = {
  BYTE_VIDEO_DIR,
  LESSON_MP4_DIR,
  ffmpegPath,
  findFont,
  ensureDir,
  runFfmpeg,
  wrapCaption,
  makeSlide,
  makeSceneWithAudio,
  makeSilentScene,
  makeImageScene,
  concatScenes,
  makePlaceholderClip,
  makeThumbnail,
  probeDurationSeconds,
  formatDuration,
  linkOrCopyFile,
};
