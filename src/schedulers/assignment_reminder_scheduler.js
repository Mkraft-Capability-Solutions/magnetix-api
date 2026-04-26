const cron = require('node-cron');
const assignmentReminderService = require('../services/assignment_reminder_service');

class AssignmentReminderScheduler {
  constructor() {
    this.job = null;
    this.isRunning = false;
  }

  async start() {
    try {
      const cronPattern = process.env.ASSIGNMENT_REMINDER_CRON || '*/30 * * * *';
      this.job = cron.schedule(cronPattern, async () => {
        await this.executeTick();
      }, {
        scheduled: false,
        timezone: process.env.TZ || 'America/New_York'
      });
      this.job.start();
      this.isRunning = true;

      console.log('📋 Assignment reminder scheduler started');
      console.log(`📅 Pattern: ${cronPattern} (${process.env.TZ || 'America/New_York'})`);
    } catch (error) {
      console.error('❌ Error starting assignment reminder scheduler:', error);
      throw error;
    }
  }

  stop() {
    try {
      if (this.job) {
        this.job.stop();
        this.job = null;
        this.isRunning = false;
        console.log('📋 Assignment reminder scheduler stopped');
      }
    } catch (error) {
      console.error('❌ Error stopping assignment reminder scheduler:', error);
    }
  }

  async executeTick() {
    const startTime = new Date();
    try {
      const summary = await assignmentReminderService.runReminderTick();
      const duration = new Date() - startTime;
      console.log(`📋 Assignment reminder tick (${duration}ms):`, JSON.stringify(summary));
    } catch (error) {
      console.error('❌ Assignment reminder tick failed:', error && error.message);
    }
  }

  async triggerManually() {
    console.log('🔧 Manual assignment reminder tick...');
    await this.executeTick();
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      cronPattern: process.env.ASSIGNMENT_REMINDER_CRON || '*/30 * * * *',
      timezone: process.env.TZ || 'America/New_York'
    };
  }
}

module.exports = new AssignmentReminderScheduler();
