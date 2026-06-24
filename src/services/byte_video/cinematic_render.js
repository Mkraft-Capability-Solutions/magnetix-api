/**
 * Cinematic scene rendering for Byte Video — the "attractive" pipeline.
 *
 * Per scene it composes: the visual (stock video b-roll, or a randomized
 * Ken Burns move over a photo), a subtle color grade + vignette, an animated
 * scene title that fades in/out, and timed subtitles that reveal the narration
 * in sync with the voice. Scenes are then stitched with randomized crossfade
 * transitions (video xfade + audio acrossfade).
 *
 * Transition cleanliness: each scene is padded with a short silent b-roll tail
 * (length = TRANSITION). The title/subtitles/voice all finish within the voice
 * portion, and the crossfade happens only over the silent tail — so two scenes'
 * text or narration never overlap.
 *
 * Fonts: bundled Poppins (assets/fonts) so the look is identical on prod Linux;
 * falls back to a system font. Text uses drawtext (no libass). Audio is bounded
 * with `-t` (never `-shortest` — that drops audio with a filtergraph in ffmpeg 6).
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

/** Split narration into ~42-char chunks, each timed proportionally over `voiceSec`. */
function subtitleChunks(narration, voiceSec) {
  const words = String(narration || '').split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const chunks = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > 42 && cur) { chunks.push(cur); cur = w; }
    else cur = (cur + ' ' + w).trim();
  }
  if (cur) chunks.push(cur);

  const totalChars = chunks.reduce((s, c) => s + c.length, 0) || 1;
  let t = 0;
  return chunks.map((text) => {
    const span = voiceSec * (text.length / totalChars);
    const start = t;
    t += span;
    return { text, start: +start.toFixed(2), end: +Math.min(t, voiceSec).toFixed(2) };
  });
}

/** drawtext for the scene title — top-center, fades in then out within the voice. */
function titleFilter(caption, workDir, tag, voiceSec) {
  if (!TITLE_FONT || !caption) return null;
  const file = path.join(workDir, `${tag}_title.txt`);
  fs.writeFileSync(file, ff.wrapCaption(caption, 30, 2), 'utf8');
  const outAt = Math.min(3.6, Math.max(2.2, voiceSec - 0.3));
  const alpha = `'if(lt(t,0.4),t/0.4,if(lt(t,${(outAt - 0.6).toFixed(2)}),1,if(lt(t,${outAt.toFixed(2)}),(${outAt.toFixed(2)}-t)/0.6,0)))'`;
  return [
    `drawtext=fontfile='${TITLE_FONT}'`,
    `textfile='${file}'`,
    'fontcolor=white', 'fontsize=50',
    'shadowcolor=black@0.6', 'shadowx=2', 'shadowy=2',
    'borderw=2', 'bordercolor=black@0.45',
    'x=(w-text_w)/2', 'y=64', 'line_spacing=10',
    `alpha=${alpha}`,
  ].join(':');
}

/** drawtext filters for timed subtitles — bottom-center, smaller, each fades in. */
function subtitleFilters(narration, voiceSec, workDir, tag) {
  if (!SUBTITLE_FONT || !narration) return [];
  return subtitleChunks(narration, voiceSec).map((c, i) => {
    const file = path.join(workDir, `${tag}_sub${i}.txt`);
    fs.writeFileSync(file, ff.wrapCaption(c.text, 40, 2), 'utf8');
    const a = `'if(lt(t,${c.start}),0,if(lt(t,${(c.start + 0.22).toFixed(2)}),(t-${c.start})/0.22,if(lt(t,${c.end}),1,0)))'`;
    return [
      `drawtext=fontfile='${SUBTITLE_FONT}'`,
      `textfile='${file}'`,
      'fontcolor=white', 'fontsize=32',
      'box=1', 'boxcolor=black@0.45', 'boxborderw=14',
      'shadowcolor=black@0.5', 'shadowx=1', 'shadowy=1',
      'x=(w-text_w)/2', 'y=h-text_h-70', 'line_spacing=6',
      `alpha=${a}`,
    ].join(':');
  });
}

/**
 * Render one scene to `outMp4`. Clip length = round(voice) + TRANSITION so the
 * tail is silent for a clean crossfade. Returns the clip length in seconds.
 * opts: { kind:'video'|'image'|'slide', sourcePath, caption, narration,
 *         audioPath, durationSec, index, workDir, outMp4 }
 */
async function renderScene(opts) {
  const { kind, sourcePath, caption, narration, audioPath, durationSec, index, workDir, outMp4 } = opts;
  const voiceSec = Math.max(2, Math.round(durationSec));
  const clipDur = voiceSec + TRANSITION;
  const frames = Math.max(2, Math.round(clipDur * FPS));
  const tag = `sc${index}`;

  let base;
  let inputArgs;
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
  const title = titleFilter(caption, workDir, tag, voiceSec);
  if (title) parts.push(title);
  for (const s of subtitleFilters(narration, voiceSec, workDir, tag)) parts.push(s);

  const filters = [`[0:v]${parts.join(',')}[v]`];
  let audioInput;
  let audioMap;
  if (audioPath) {
    audioInput = ['-i', audioPath];
    filters.push('[1:a]apad[a]'); // pad voice with silence to fill the clip
    audioMap = '[a]';
  } else {
    audioInput = ['-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100'];
    audioMap = '1:a';
  }

  await ff.runFfmpeg([
    ...inputArgs,
    ...audioInput,
    '-filter_complex', filters.join(';'),
    '-map', '[v]', '-map', audioMap,
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-r', String(FPS),
    '-c:a', 'aac', '-b:a', '192k', '-ar', '44100',
    '-t', String(clipDur), outMp4,
  ]);

  return clipDur;
}

/**
 * Stitch scene clips with randomized crossfade transitions. The crossfade
 * length equals the per-scene silent pad, so transitions land on the quiet
 * tails and never overlap two scenes' content. `durations` are the clip
 * lengths returned by renderScene.
 */
async function stitchScenes(clips, durations, outMp4, workDir) {
  if (clips.length === 1) {
    fs.copyFileSync(clips[0], outMp4);
    return;
  }
  const T = TRANSITION;
  const inputs = [];
  clips.forEach((c) => inputs.push('-i', c));

  let vlabel = '[0:v]';
  let alabel = '[0:a]';
  const chain = [];
  let offset = 0;
  for (let i = 1; i < clips.length; i++) {
    offset += durations[i - 1] - T;
    const trans = TRANSITIONS[i % TRANSITIONS.length];
    const vout = `[v${i}]`;
    const aout = `[a${i}]`;
    chain.push(`${vlabel}[${i}:v]xfade=transition=${trans}:duration=${T}:offset=${offset.toFixed(2)}${vout}`);
    chain.push(`${alabel}[${i}:a]acrossfade=d=${T}${aout}`);
    vlabel = vout;
    alabel = aout;
  }

  await ff.runFfmpeg([
    ...inputs,
    '-filter_complex', chain.join(';'),
    '-map', vlabel, '-map', alabel,
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-r', String(FPS),
    '-c:a', 'aac', '-b:a', '192k',
    outMp4,
  ]);
}

module.exports = { renderScene, stitchScenes };
