/**
 * "explainer" Byte Video provider — the working default with no paid video
 * vendor. Reuses the existing Gemini key to write a script, synthesizes
 * narration with a free TTS (node-gtts), renders captioned slides, and muxes
 * a narrated mp4 with the bundled ffmpeg.
 *
 * TTS needs outbound internet; if it fails for a scene the slide is held
 * silently for an estimated duration, so generation never hard-fails on TTS.
 *
 * Provider contract: async generate(job) -> {
 *   title, scriptJson, outputFilename, thumbnailFilename, durationSeconds
 * }  (filenames are basenames inside uploads/byte_videos)
 */
const path = require('path');
const fs = require('fs');
const os = require('os');
const geminiAIService = require('../../gemini/gemini_ai_service');
const ff = require('../ffmpeg_util');
const imageSource = require('../image_source');

const name = 'explainer';

/** Synthesize narration to an mp3 via node-gtts. Resolves on success. */
function ttsSave(text, outPath) {
  return new Promise((resolve, reject) => {
    try {
      // Lazy-require so a missing/broken module doesn't crash module load.
      const gtts = require('node-gtts')('en');
      gtts.save(outPath, text, (err) => (err ? reject(err) : resolve()));
    } catch (err) {
      reject(err);
    }
  });
}

/** Rough spoken duration estimate (~2.6 words/sec), floored at 3s. */
function estimateSeconds(text) {
  const words = String(text || '').split(/\s+/).filter(Boolean).length;
  return Math.max(3, Math.ceil(words / 2.6));
}

async function generate(job) {
  // 1. Script from Gemini (throws CONTENT_FILTERED / PARSE_ERROR / AI_SERVICE_ERROR)
  const script = await geminiAIService.generateVideoScript(job.command);

  ff.ensureDir(ff.BYTE_VIDEO_DIR);
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'byte-video-'));

  try {
    const sceneClips = [];
    let totalSeconds = 0;

    for (let i = 0; i < script.scenes.length; i++) {
      const scene = script.scenes[i];
      const sceneMp4 = path.join(workDir, `scene_${i}.mp4`);
      const narration = scene.narration || scene.caption || '';

      // Narration audio (best-effort; silent fallback if TTS unavailable).
      let audioPath = null;
      let durationSec = estimateSeconds(narration);
      if (narration) {
        const candidate = path.join(workDir, `scene_${i}.mp3`);
        try {
          await ttsSave(narration, candidate);
          if (fs.existsSync(candidate) && fs.statSync(candidate).size > 0) {
            audioPath = candidate;
            durationSec = (await ff.probeDurationSeconds(candidate)) || durationSec;
          }
        } catch (ttsErr) {
          console.warn(`⚠️  Byte Video TTS failed on scene ${i}, using silent scene:`, ttsErr.message);
        }
      }

      // Try a relevant stock photo (Ken Burns); fall back to a caption slide.
      const query = scene.imageQuery || scene.caption || script.title;
      const imagePath = path.join(workDir, `img_${i}.jpg`);
      let haveImage = false;
      try {
        haveImage = await imageSource.fetchSceneImage(query, imagePath, i);
      } catch (imgErr) {
        console.warn(`⚠️  Byte Video image fetch failed on scene ${i}:`, imgErr.message);
      }

      if (haveImage) {
        await ff.makeImageScene(imagePath, scene.caption, audioPath, durationSec, sceneMp4, workDir);
      } else {
        const slidePng = path.join(workDir, `slide_${i}.png`);
        await ff.makeSlide(scene.caption || script.title, slidePng, workDir);
        if (audioPath) {
          await ff.makeSceneWithAudio(slidePng, audioPath, sceneMp4);
        } else {
          await ff.makeSilentScene(slidePng, durationSec, sceneMp4);
        }
      }

      sceneClips.push(sceneMp4);
      totalSeconds += durationSec;
    }

    // 2. Concat + thumbnail into uploads/byte_videos
    const base = `${Date.now()}`;
    const outputFilename = `${base}.mp4`;
    const thumbnailFilename = `${base}.jpg`;
    const outputPath = path.join(ff.BYTE_VIDEO_DIR, outputFilename);
    const thumbPath = path.join(ff.BYTE_VIDEO_DIR, thumbnailFilename);

    await ff.concatScenes(sceneClips, outputPath, workDir);

    let finalThumb = null;
    try {
      await ff.makeThumbnail(outputPath, thumbPath);
      finalThumb = thumbnailFilename;
    } catch (thumbErr) {
      console.warn('⚠️  Byte Video thumbnail generation failed:', thumbErr.message);
    }

    return {
      title: script.title,
      scriptJson: script,
      outputFilename,
      thumbnailFilename: finalThumb,
      durationSeconds: totalSeconds,
    };
  } finally {
    try {
      fs.rmSync(workDir, { recursive: true, force: true });
    } catch (_) { /* ignore cleanup errors */ }
  }
}

module.exports = { name, generate };
