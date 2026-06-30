/**
 * Byte Video service — owns the `byte_videos` table and orchestrates
 * generation through the configured provider. Returns ServiceResponseDTO /
 * ErrorResponseDTO like the other AI features.
 */
const path = require('path');
const fs = require('fs');
const { promisePool } = require('../../config/db');
const { ServiceResponseDTO, ErrorResponseDTO } = require('../../dto/response_dto');
const { getProvider } = require('./providers');
const ff = require('./ffmpeg_util');
const lessonService = require('../admin/lesson_service');
const voiceSource = require('./voice_source');

const ROLE_LABELS = { 2: 'instructor', 4: 'super_admin' };

function roleLabel(roleId) {
  return ROLE_LABELS[roleId] || `role_${roleId}`;
}

function mapRow(row) {
  return {
    id: row.id,
    command: row.command,
    title: row.title,
    status: row.status,
    provider: row.provider,
    voiceId: row.voice_id || null,
    scriptJson: row.script_json
      ? (typeof row.script_json === 'string' ? JSON.parse(row.script_json) : row.script_json)
      : null,
    outputFilename: row.output_filename,
    thumbnailFilename: row.thumbnail_filename,
    durationSeconds: row.duration_seconds,
    errorMessage: row.error_message,
    createdBy: row.created_by,
    creatorRole: row.creator_role,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

class ByteVideoService {
  /** Selectable narration voices for the generate form. */
  async listVoices() {
    try {
      const voices = await voiceSource.listVoices();
      return new ServiceResponseDTO(true, voices);
    } catch (error) {
      console.error('listVoices error:', error.message);
      return new ErrorResponseDTO({ message: error.message, code: 'VOICES_ERROR' }, 500);
    }
  }

  /** Create a pending generation job for the current user. */
  async createJob(userUuid, roleId, { command, title, voiceId }) {
    try {
      const provider = getProvider().name;
      const [result] = await promisePool.query(
        `INSERT INTO byte_videos (created_by, creator_role, command, title, status, provider, voice_id)
         VALUES (?, ?, ?, ?, 'pending', ?, ?)`,
        [userUuid, roleLabel(roleId), command, title || null, provider, voiceId || null]
      );
      const [rows] = await promisePool.query('SELECT * FROM byte_videos WHERE id = ?', [result.insertId]);
      return new ServiceResponseDTO(true, mapRow(rows[0]), 'Byte video queued for generation');
    } catch (error) {
      console.error('createJob error:', error.message);
      return new ErrorResponseDTO({ message: error.message, code: 'DB_ERROR' }, 500);
    }
  }

  /** List the current user's byte videos, newest first. */
  async listByUser(userUuid) {
    try {
      const [rows] = await promisePool.query(
        'SELECT * FROM byte_videos WHERE created_by = ? ORDER BY created_at DESC',
        [userUuid]
      );
      return new ServiceResponseDTO(true, rows.map(mapRow));
    } catch (error) {
      console.error('listByUser error:', error.message);
      return new ErrorResponseDTO({ message: error.message, code: 'DB_ERROR' }, 500);
    }
  }

  /** Fetch one byte video owned by the user (for status polling). */
  async getById(id, userUuid) {
    try {
      const [rows] = await promisePool.query(
        'SELECT * FROM byte_videos WHERE id = ? AND created_by = ?',
        [id, userUuid]
      );
      if (rows.length === 0) {
        return new ErrorResponseDTO({ message: 'Byte video not found', code: 'NOT_FOUND' }, 404);
      }
      return new ServiceResponseDTO(true, mapRow(rows[0]));
    } catch (error) {
      console.error('getById error:', error.message);
      return new ErrorResponseDTO({ message: error.message, code: 'DB_ERROR' }, 500);
    }
  }

  /** Delete a byte video (and its files) owned by the user. */
  async deleteJob(id, userUuid) {
    try {
      const [rows] = await promisePool.query(
        'SELECT * FROM byte_videos WHERE id = ? AND created_by = ?',
        [id, userUuid]
      );
      if (rows.length === 0) {
        return new ErrorResponseDTO({ message: 'Byte video not found', code: 'NOT_FOUND' }, 404);
      }
      const row = rows[0];
      for (const fname of [row.output_filename, row.thumbnail_filename]) {
        if (fname) {
          const fp = path.join(ff.BYTE_VIDEO_DIR, fname);
          try { if (fs.existsSync(fp)) fs.unlinkSync(fp); } catch (_) { /* ignore */ }
        }
      }
      await promisePool.query('DELETE FROM byte_videos WHERE id = ?', [id]);
      return new ServiceResponseDTO(true, { id }, 'Byte video deleted');
    } catch (error) {
      console.error('deleteJob error:', error.message);
      return new ErrorResponseDTO({ message: error.message, code: 'DB_ERROR' }, 500);
    }
  }

  /**
   * Create a new standalone, Content-Based lesson from a completed byte video —
   * the same path the Content Management page uses (lessonService
   * .createStandaloneLesson). Defaults: lessonType 'Content-Based',
   * contentType 'mp4', duration probed from the actual mp4. The video file is
   * hard-linked (not copied) into the lessons mp4 folder, so no bytes are
   * duplicated and the byte video stays independently watchable/deletable.
   */
  async createLessonFromByteVideo(id, userUuid, { title } = {}) {
    try {
      const [rows] = await promisePool.query(
        'SELECT * FROM byte_videos WHERE id = ? AND created_by = ?',
        [id, userUuid]
      );
      if (rows.length === 0) {
        return new ErrorResponseDTO({ message: 'Byte video not found', code: 'NOT_FOUND' }, 404);
      }
      const row = rows[0];
      if (row.status !== 'completed' || !row.output_filename) {
        return new ErrorResponseDTO({ message: 'Byte video is not ready yet', code: 'NOT_READY' }, 400);
      }

      const sourcePath = path.join(ff.BYTE_VIDEO_DIR, row.output_filename);
      if (!fs.existsSync(sourcePath)) {
        return new ErrorResponseDTO({ message: 'Byte video file is missing', code: 'FILE_MISSING' }, 410);
      }

      // Place the same bytes under the lessons mp4 folder via a hard link.
      ff.ensureDir(ff.LESSON_MP4_DIR);
      const newFilename = `${Date.now()}.mp4`;
      ff.linkOrCopyFile(sourcePath, path.join(ff.LESSON_MP4_DIR, newFilename));

      // Duration straight from the file (falls back to the stored estimate).
      const probed = await ff.probeDurationSeconds(sourcePath);
      const durationLabel = ff.formatDuration(probed || row.duration_seconds);

      const lessonTitle = (title && title.trim()) || row.title || row.command.slice(0, 120);
      const created = await lessonService.createStandaloneLesson(userUuid, {
        title: lessonTitle,
        lessonType: 'Content-Based',
        contentType: 'mp4',
        videoUpload: newFilename,
        lessonDuration: durationLabel,
        description: `Generated with Byte Video from: ${row.command}`.slice(0, 1000),
      });

      return new ServiceResponseDTO(
        true,
        { lessonId: created.data.id, title: lessonTitle, contentType: 'mp4', duration: durationLabel, filename: newFilename },
        'Lesson created from byte video'
      );
    } catch (error) {
      console.error('createLessonFromByteVideo error:', error.message);
      return new ErrorResponseDTO({ message: error.message, code: 'DB_ERROR' }, 500);
    }
  }

  // --- Scheduler-facing methods -------------------------------------------

  /** Atomically claim up to `limit` pending jobs by flipping them to processing. */
  async claimPendingJobs(limit = 1) {
    const [rows] = await promisePool.query(
      "SELECT * FROM byte_videos WHERE status = 'pending' ORDER BY created_at ASC LIMIT ?",
      [limit]
    );
    const claimed = [];
    for (const row of rows) {
      const [res] = await promisePool.query(
        "UPDATE byte_videos SET status = 'processing' WHERE id = ? AND status = 'pending'",
        [row.id]
      );
      if (res.affectedRows === 1) claimed.push(row);
    }
    return claimed;
  }

  /** Run generation for one already-claimed (processing) job. */
  async runJob(job) {
    try {
      const provider = getProvider();
      console.log(`🎬 Byte Video #${job.id} generating with provider "${provider.name}"`);
      const result = await provider.generate(job);

      await promisePool.query(
        `UPDATE byte_videos
         SET status = 'completed', title = ?, script_json = ?, output_filename = ?,
             thumbnail_filename = ?, duration_seconds = ?, provider = ?, error_message = NULL
         WHERE id = ?`,
        [
          result.title || job.title || null,
          result.scriptJson ? JSON.stringify(result.scriptJson) : null,
          result.outputFilename,
          result.thumbnailFilename || null,
          result.durationSeconds || null,
          provider.name,
          job.id,
        ]
      );
      console.log(`✅ Byte Video #${job.id} completed: ${result.outputFilename}`);
    } catch (error) {
      const message = (error && error.message) ? error.message : 'Unknown generation error';
      console.error(`❌ Byte Video #${job.id} failed:`, message);
      await promisePool.query(
        "UPDATE byte_videos SET status = 'failed', error_message = ? WHERE id = ?",
        [message.slice(0, 1000), job.id]
      );
    }
  }
}

module.exports = new ByteVideoService();
