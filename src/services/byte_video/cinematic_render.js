/**
 * Cinematic scene rendering for Byte Video — the "attractive" pipeline.
 *
 * Each scene becomes a VIDEO-ONLY clip (stock b-roll or randomized Ken Burns
 * photo) with a color grade + vignette, an animated title, and timed subtitles.
 * Audio is handled separately: per-scene narration is concatenated into one
 * continuous track and muxed over the crossfaded video. This keeps every
 * section's narration at full volume from its first word (no acrossfade dip)
 * and perfectly aligned with the scenes.
 *
 * Subtitles use real ElevenLabs word timings when available (word-perfect),
 * else proportional timing. Each scene is padded with a short silent tail so
 * the crossfade lands on quiet b-roll — two scenes' text/voice never overlap.
 *
 * Fonts: bundled Poppins (assets/fonts). Text via drawtext (no libass).
 */
const path = require('path');
const fs = require('fs');
const ff = require('./ffmpeg_util');

const WIDTH = 1280;
const HEIGHT = 720;
const FPS = 25;
const TRANSITION = 0.6; // seconds — also the silent pad per scene
const GRADE = 'eq=contrast=1.06:saturation=1.14:brightness=0.012';
const VIGNETTE = 'vignette=PI/5';

const TRANSITIONS = ['fade', 'dissolve', 'smoothleft', 'smoothright', 'circleopen', 'radial', 'fadeblack'];

const FONTS_DIR = path.join(__dirname, '../../../assets/fonts');
function resolveFont(file) {
  const p = path.join(FONTS_DIR, file);
  return fs.existsSync(p) ? p : ff.findFont();
}
const TITLE_FONT = resolveFont('Poppins-SemiBold.ttf');
const SUBTITLE_FONT = resolveFont('Poppins-Medium.ttf');

/** A randomized Ken Burns zoompan move for a still photo (varies by index). */
function kenBurns(index, frames) {
  const z = `s=${WIDTH}x${HEIGHT}:fps=${FPS}:d=${frames}`;
  const center = `x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'`;
  switch (index % 5) {
    case 0: return `zoompan=z='min(zoom+0.0008,1.35)':${center}:${z}`;
    case 1: return `zoompan=z='if(eq(on,0),1.35,max(1.02,zoom-0.0008))':${center}:${z}`;
    case 2: return `zoompan=z='1.18':x='(iw-iw/zoom)*on/${frames}':y='ih/2-(ih/zoom/2)':${z}`;
    case 3: return `zoompan=z='1.18':x='(iw-iw/zoom)*(1-on/${frames})':y='ih/2-(ih/zoom/2)':${z}`;
    default: return `zoompan=z='1.18':x='iw/2-(iw/zoom/2)':y='(ih-ih/zoom)*on/${frames}':${z}`;
  }
}

/** Pack words into ~42-char subtitle lines using real word start/end times. */
function chunksFromWords(words, voiceSec) {
  const usable = (words || []).filter((w) => typeof w.start === 'number' && typeof w.end === 'number');
  if (usable.length === 0) return null;
  const chunks = [];
  let cur = [];
  let len = 0;
  const flush = () => {
    if (!cur.length) return;
    chunks.push({
      text: cur.map((w) => w.word).join(' '),
      start: +Math.max(0, cur[0].start).toFixed(2),
      end: +Math.min(voiceSec, cur[cur.length - 1].end).toFixed(2),
    });
    cur = []; len = 0;
  };
  for (const w of usable) {
    const add = w.word.length + 1;
    if (len + add > 42 && cur.length) flush();
    cur.push(w); len += add;
  }
  flush();
  return chunks.length ? chunks : null;
}

/** Proportional fallback when there are no word timings. */
function chunksProportional(narration, voiceSec) {
  const words = String(narration || '').split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const lines = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > 42 && cur) { lines.push(cur); cur = w; }
    else cur = (cur + ' ' + w).trim();
  }
  if (cur) lines.push(cur);
  const total = lines.reduce((s, c) => s + c.length, 0) || 1;
  let t = 0;
  return lines.map((text) => {
    const span = voiceSec * (text.length / total);
    const start = t; t += span;
    return { text, start: +start.toFixed(2), end: +Math.min(t, voiceSec).toFixed(2) };
  });
}

function titleFilter(caption, workDir, tag, voiceSec) {
  if (!TITLE_FONT || !caption) return null;
  const file = path.join(workDir, `${tag}_title.txt`);
  fs.writeFileSync(file, ff.wrapCaption(caption, 30, 2), 'utf8');
  const outAt = Math.min(3.6, Math.max(2.2, voiceSec - 0.3));
  const alpha = `'if(lt(t,0.4),t/0.4,if(lt(t,${(outAt - 0.6).toFixed(2)}),1,if(lt(t,${outAt.toFixed(2)}),(${outAt.toFixed(2)}-t)/0.6,0)))'`;
  return [
    `drawtext=fontfile='${TITLE_FONT}'`, `textfile='${file}'`,
    'fontcolor=white', 'fontsize=50',
    'shadowcolor=black@0.6', 'shadowx=2', 'shadowy=2',
    'borderw=2', 'bordercolor=black@0.45',
    'x=(w-text_w)/2', 'y=64', 'line_spacing=10', `alpha=${alpha}`,
  ].join(':');
}

function subtitleFilters(narration, voiceSec, workDir, tag, words) {
  if (!SUBTITLE_FONT || !narration) return [];
  const chunks = chunksFromWords(words, voiceSec) || chunksProportional(narration, voiceSec);
  return chunks.map((c, i) => {
    const file = path.join(workDir, `${tag}_sub${i}.txt`);
    fs.writeFileSync(file, ff.wrapCaption(c.text, 40, 2), 'utf8');
    const a = `'if(lt(t,${c.start}),0,if(lt(t,${(c.start + 0.18).toFixed(2)}),(t-${c.start})/0.18,if(lt(t,${c.end}),1,0)))'`;
    return [
      `drawtext=fontfile='${SUBTITLE_FONT}'`, `textfile='${file}'`,
      'fontcolor=white', 'fontsize=32',
      'box=1', 'boxcolor=black@0.45', 'boxborderw=14',
      'shadowcolor=black@0.5', 'shadowx=1', 'shadowy=1',
      'x=(w-text_w)/2', 'y=h-text_h-70', 'line_spacing=6', `alpha=${a}`,
    ].join(':');
  });
}

/**
 * Render one VIDEO-ONLY scene clip (length = round(voice) + TRANSITION).
 * opts: { kind, sourcePath, caption, narration, words, voiceSec, index, workDir, outMp4 }
 * Returns the clip length in seconds.
 */
async function renderScene(opts) {
  const { kind, sourcePath, caption, narration, words, voiceSec, index, workDir, outMp4 } = opts;
  const vSec = Math.max(2, Math.round(voiceSec));
  const clipDur = vSec + TRANSITION;
  const frames = Math.max(2, Math.round(clipDur * FPS));
  const tag = `sc${index}`;

  let base; let inputArgs;
  if (kind === 'video') {
    base = `scale=${WIDTH}:${HEIGHT}:force_original_aspect_ratio=increase,crop=${WIDTH}:${HEIGHT},setsar=1,fps=${FPS}`;
    inputArgs = ['-stream_loop', '-1', '-i', sourcePath];
  } else if (kind === 'image') {
    base = `scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,${kenBurns(index, frames)}`;
    inputArgs = ['-loop', '1', '-i', sourcePath];
  } else {
    base = `scale=${WIDTH}:${HEIGHT},setsar=1,fps=${FPS}`;
    inputArgs = ['-f', 'lavfi', '-i', `color=c=0x0f172a:s=${WIDTH}x${HEIGHT}`];
  }

  const parts = [base, GRADE, VIGNETTE];
  const title = titleFilter(caption, workDir, tag, vSec);
  if (title) parts.push(title);
  for (const s of subtitleFilters(narration, vSec, workDir, tag, words)) parts.push(s);

  await ff.runFfmpeg([
    ...inputArgs,
    '-filter_complex', `[0:v]${parts.join(',')}[v]`,
    '-map', '[v]', '-an',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-r', String(FPS),
    '-t', String(clipDur), outMp4,
  ]);

  return clipDur;
}

/** Build an audio segment of exactly `voiceSec` seconds (voice + silence pad, or silence). */
async function makeAudioSegment(voicePath, voiceSec, outPath) {
  if (voicePath) {
    await ff.runFfmpeg(['-i', voicePath, '-af', 'apad', '-t', String(voiceSec), '-ar', '44100', '-ac', '2', '-c:a', 'aac', '-b:a', '192k', outPath]);
  } else {
    await ff.runFfmpeg(['-f', 'lavfi', '-t', String(voiceSec), '-i', 'anullsrc=r=44100:cl=stereo', '-c:a', 'aac', '-b:a', '192k', outPath]);
  }
}

/**
 * Combine scenes: crossfade the video-only clips and concatenate the per-scene
 * narration into one continuous, full-volume track muxed over the video.
 * scenes: [{ video, clipDur, voicePath, voiceSec }]
 */
async function composeFinal(scenes, outMp4, workDir) {
  const segs = [];
  for (let i = 0; i < scenes.length; i++) {
    const seg = path.join(workDir, `seg_${i}.m4a`);
    await makeAudioSegment(scenes[i].voicePath, Math.max(2, Math.round(scenes[i].voiceSec)), seg);
    segs.push(seg);
  }

  if (scenes.length === 1) {
    await ff.runFfmpeg([
      '-i', scenes[0].video, '-i', segs[0],
      '-map', '0:v', '-map', '1:a',
      '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', outMp4,
    ]);
    return;
  }

  const N = scenes.length;
  const inputs = [];
  scenes.forEach((s) => inputs.push('-i', s.video));
  segs.forEach((s) => inputs.push('-i', s));

  const chain = [];
  let vlabel = '[0:v]';
  let offset = 0;
  for (let i = 1; i < N; i++) {
    offset += scenes[i - 1].clipDur - TRANSITION;
    const trans = TRANSITIONS[i % TRANSITIONS.length];
    const vout = i === N - 1 ? '[v]' : `[vx${i}]`;
    chain.push(`${vlabel}[${i}:v]xfade=transition=${trans}:duration=${TRANSITION}:offset=${offset.toFixed(2)}${vout}`);
    vlabel = vout;
  }
  const alabels = scenes.map((_, i) => `[${N + i}:a]`).join('');
  chain.push(`${alabels}concat=n=${N}:v=0:a=1[a]`);

  await ff.runFfmpeg([
    ...inputs,
    '-filter_complex', chain.join(';'),
    '-map', '[v]', '-map', '[a]',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-r', String(FPS),
    '-c:a', 'aac', '-b:a', '192k',
    outMp4,
  ]);
}

module.exports = { renderScene, composeFinal };
