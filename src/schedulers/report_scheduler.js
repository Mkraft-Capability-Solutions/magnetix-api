const cron = require('node-cron');
const reportSchedulerService = require('../services/admin/report_scheduler_service');
const reportService = require('../services/admin/report_service');
const emailHelper = require('../utils/email_helper');
const { generatePDF } = require('../utils/report_generator');
const fs = require('fs');

class ReportScheduler {
  constructor() {
    this.job = null;
    this.isRunning = false;
  }

  async start() {
    try {
      // Run every minute to check for due schedules
      this.job = cron.schedule('* * * * *', async () => {
        await this.executeJob();
      }, {
        scheduled: false,
        timezone: process.env.TZ || 'Asia/Kolkata'
      });

      this.job.start();
      this.isRunning = true;

      console.log('📊 Report scheduler started (checks every minute)');
    } catch (error) {
      console.error('❌ Error starting report scheduler:', error);
      throw error;
    }
  }

  stop() {
    try {
      if (this.job) {
        this.job.stop();
        this.job = null;
        this.isRunning = false;
        console.log('📊 Report scheduler stopped');
      }
    } catch (error) {
      console.error('❌ Error stopping report scheduler:', error);
    }
  }

  async executeJob() {
    try {
      const dueSchedules = await reportSchedulerService.getDueSchedules();

      if (dueSchedules.length === 0) return;

      console.log(`📊 Found ${dueSchedules.length} report schedule(s) to process`);

      for (const schedule of dueSchedules) {
        await this.processSchedule(schedule);
      }
    } catch (error) {
      console.error('❌ Report scheduler job error:', error.message);
    }
  }

  async processSchedule(schedule) {
    const startTime = Date.now();
    console.log(`📊 Processing schedule #${schedule.id} (${schedule.frequency}) for ${schedule.recipients.length} recipient(s)`);

    try {
      // Fetch analytics data
      const analyticsData = await reportService.getDashboardAnalytics();

      // Generate PDF on the server
      const reportResult = await generatePDF('analytics', 'Analytics Report', this.flattenAnalyticsData(analyticsData), {
        dateRange: { from: 'All time', to: new Date().toLocaleDateString() }
      });

      // Read the generated PDF file as a buffer
      const pdfBuffer = fs.readFileSync(reportResult.filePath);

      // Send email to all recipients
      await emailHelper.sendScheduledReportEmail(
        schedule.recipients,
        'Analytics Report',
        pdfBuffer,
        reportResult.fileName
      );

      // Mark as sent
      await reportSchedulerService.markAsSent(schedule.id);

      // Cleanup the temp PDF file
      try { fs.unlinkSync(reportResult.filePath); } catch (_) { /* ignore */ }

      const duration = Date.now() - startTime;
      console.log(`✅ Schedule #${schedule.id} processed in ${duration}ms — sent to ${schedule.recipients.length} recipient(s)`);
    } catch (error) {
      console.error(`❌ Schedule #${schedule.id} failed:`, error.message);
    }
  }

  /**
   * Flatten the analytics data object into an array suitable for the generic PDF table
   */
  flattenAnalyticsData(data) {
    if (!data) return [];

    const rows = [];
    const stats = data.dashboardStats || [];

    stats.forEach(stat => {
      rows.push({ metric: stat.title || 'N/A', value: String(stat.value ?? 0) });
    });

    if (data.learningEngagement) {
      const eng = data.learningEngagement;
      rows.push({ metric: 'Total Active Users', value: String(eng.totalActiveUsers || 0) });
      rows.push({ metric: 'Total Enrollments', value: String(eng.totalEnrollments || 0) });
      rows.push({ metric: 'Total Time Spent (min)', value: String(eng.totalTimeSpentMinutes || 0) });
      rows.push({ metric: 'Avg Time Per User (min)', value: String(eng.avgTimePerUser || 0) });
    }

    return rows;
  }

  getStatus() {
    return {
      isRunning: this.isRunning
    };
  }
}

module.exports = new ReportScheduler();
