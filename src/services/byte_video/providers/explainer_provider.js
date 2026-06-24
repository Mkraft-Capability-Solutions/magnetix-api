/**
 * "explainer" Byte Video provider — assembled cinematic video, no avatar vendor.
 *
 * Per scene it picks the best visual available:
 *   stock VIDEO b-roll (Pexels)  ->  stock PHOTO with randomized Ken Burns
 *   (Pexels/Openverse)  ->  styled caption slide (always works).
 * Voice: ElevenLabs (natural) -> node-gtts (free). Each scene gets an animated
 * title, color grade + vignette, and timed subtitles synced to the narration;
 * scenes are stitched with randomized crossfade transitions
 * (see cinematic_render.js).
 *
 * Reuses the Gemini key for the script (caption/narration/imageQuery per scene)
 * and degrades gracefully so generation never hard-fails on a missing key,
 * image, or TTS.
 *
 * Provider contract: async generate(job) -> {
 *   title, scriptJson, outputFilename, thumbnailFilename, durationSeconds
 * }
 */
const path = require('path');
const fs = require('fs');
const os = require('os');
const geminiAIService = require('../../gemini/gemini_ai_service');
const ff = require('../ffmpeg_util');
const imageSource = require('../image_source');
const videoSource = require('../video_source');
const voiceSource = require('../voice_source');
const cinematic = require('../cinematic_render');

const name = 'explainer';

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
    const durations = [];

    for (let i = 0; i < script.scenes.length; i++) {
      const scene = script.scenes[i];
      const sceneMp4 = path.join(workDir, `scene_${i}.mp4`);
      const narration = scene.narration || scene.caption || '';

      // Narration audio (ElevenLabs -> gTTS; silent fallback on failure).
      let audioPath = null;
      let durationSec = estimateSeconds(narration);
      if (narration) {
        const candidate = path.join(workDir, `scene_${i}.mp3`);
        try {
          const ok = await voiceSource.synthesizeSpeech(narration, candidate);
          if (ok && fs.existsSync(candidate) && fs.statSync(candidate).size > 0) {
            audioPath = candidate;
            durationSec = (await ff.probeDurationSeconds(candidate)) || durationSec;
          }
        } catch (ttsErr) {
          console.warn(`⚠️  Byte Video voice failed on scene ${i}, using silent scene:`, ttsErr.message);
        }
      }

      // Visual: stock video -> stock photo -> styled slide.
      const query = scene.imageQuery || scene.caption || script.title;
      const clipPath = path.join(workDir, `clip_${i}.mp4`);
      const imagePath = path.join(workDir, `img_${i}.jpg`);
      let kind = 'slide';
      let sourcePath = null;

      try {
        if (await videoSource.fetchSceneVideo(query, clipPath, i)) { kind = 'video'; sourcePath = clipPath; }
      } catch (vErr) {
        console.warn(`⚠️  Byte Video stock-video failed on scene ${i}:`, vErr.message);
      }
      if (kind === 'slide') {
        try {
          if (await imageSource.fetchSceneImage(query, imagePath, i)) { kind = 'image'; sourcePath = imagePath; }
        } catch (iErr) {
          console.warn(`⚠️  Byte Video image failed on scene ${i}:`, iErr.message);
        }
      }

      const dur = await cinematic.renderScene({
        kind,
        sourcePath,
        caption: scene.caption,
        narration,
        audioPath,
        durationSec,
        index: i,
        workDir,
        outMp4: sceneMp4,
      });

      sceneClips.push(sceneMp4);
      durations.push(dur);
    }

    // 2. Stitch with crossfades + thumbnail into uploads/byte_videos
    const base = `${Date.now()}`;
    const outputFilename = `${base}.mp4`;
    const thumbnailFilename = `${base}.jpg`;
    const outputPath = path.join(ff.BYTE_VIDEO_DIR, outputFilename);
    const thumbPath = path.join(ff.BYTE_VIDEO_DIR, thumbnailFilename);

    await cinematic.stitchScenes(sceneClips, durations, outputPath, workDir);

    let finalThumb = null;
    try {
      await ff.makeThumbnail(outputPath, thumbPath);
      finalThumb = thumbnailFilename;
    } catch (thumbErr) {
      console.warn('⚠️  Byte Video thumbnail generation failed:', thumbErr.message);
    }

    const totalSeconds = (await ff.probeDurationSeconds(outputPath))
      || durations.reduce((a, b) => a + b, 0);

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
