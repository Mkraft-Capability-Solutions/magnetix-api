/**
 * Byte Video scheduler — background worker that turns queued byte-video jobs
 * into rendered mp4s. Generation is long-running (script + voice + ffmpeg, or
 * an avatar render), so it runs out-of-band here instead of in the request.
 * Mirrors report_scheduler.js (node-cron, start/stop/executeJob, guard).
 */
const cron = require('node-cron');
const byteVideoService = require('../services/byte_video/byte_video_service');

// How many jobs to render per tick. Generation is heavy; pending jobs roll
// over to the next tick.
const BATCH_SIZE = 1;

class ByteVideoScheduler {
  constructor() {
    this.job = null;
    this.isRunning = false;   // scheduler started
    this.isWorking = false;   // a tick is currently processing
  }

  async start() {
    try {
      this.job = cron.schedule('*/30 * * * * *', async () => {
        await this.executeJob();
      }, {
        scheduled: false,
        timezone: process.env.TZ || 'Asia/Kolkata',
      });

      this.job.start();
      this.isRunning = true;
      console.log('🎬 Byte Video scheduler started (checks every 30s)');
    } catch (error) {
      console.error('❌ Error starting byte video scheduler:', error);
      throw error;
    }
  }

  stop() {
    try {
      if (this.job) {
        this.job.stop();
        this.job = null;
        this.isRunning = false;
        console.log('🎬 Byte Video scheduler stopped');
      }
    } catch (error) {
      console.error('❌ Error stopping byte video scheduler:', error);
    }
  }

  async executeJob() {
    if (this.isWorking) return; // don't overlap long renders across ticks
    this.isWorking = true;
    try {
      const jobs = await byteVideoService.claimPendingJobs(BATCH_SIZE);
      if (jobs.length === 0) return;

      console.log(`🎬 Byte Video: processing ${jobs.length} job(s)`);
      for (const job of jobs) {
        await byteVideoService.runJob(job);
      }
    } catch (error) {
      console.error('❌ Byte Video scheduler job error:', error.message);
    } finally {
      this.isWorking = false;
    }
  }
}

module.exports = new ByteVideoScheduler();
