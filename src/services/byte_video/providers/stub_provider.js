/**
 * "stub" Byte Video provider — produces a short placeholder clip without
 * Gemini, TTS, or any external service. Useful when no real provider is
 * configured, and proves the whole pipeline (job -> render -> store ->
 * watch/download/lesson) works end to end. Select with `BYTE_VIDEO_PROVIDER=stub`.
 */
const path = require('path');
const fs = require('fs');
const os = require('os');
const ff = require('../ffmpeg_util');

const name = 'stub';

async function generate(job) {
  ff.ensureDir(ff.BYTE_VIDEO_DIR);
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'byte-video-stub-'));

  try {
    const base = `${Date.now()}`;
    const outputFilename = `${base}.mp4`;
    const thumbnailFilename = `${base}.jpg`;
    const outputPath = path.join(ff.BYTE_VIDEO_DIR, outputFilename);
    const thumbPath = path.join(ff.BYTE_VIDEO_DIR, thumbnailFilename);

    const caption = `Byte Video\n(placeholder)\n${(job.command || '').slice(0, 60)}`;
    await ff.makePlaceholderClip(caption, 4, outputPath, workDir);

    let finalThumb = null;
    try {
      await ff.makeThumbnail(outputPath, thumbPath);
      finalThumb = thumbnailFilename;
    } catch (_) { /* optional */ }

    return {
      title: (job.command || 'Byte Video').slice(0, 80),
      scriptJson: { title: 'Placeholder', scenes: [{ caption: 'Placeholder', narration: '' }] },
      outputFilename,
      thumbnailFilename: finalThumb,
      durationSeconds: 4,
    };
  } finally {
    try {
      fs.rmSync(workDir, { recursive: true, force: true });
    } catch (_) { /* ignore */ }
  }
}

module.exports = { name, generate };
