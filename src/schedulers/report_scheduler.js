const cron = require('node-cron');
const reportSchedulerService = require('../services/admin/report_scheduler_service');
const reportService = require('../services/admin/report_service');
const emailHelper = require('../utils/email_helper');
const { generateAnalyticsPDFBuffer } = require('../utils/analytics_pdf_generator');

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
      // Fetch ALL analytics data — same endpoints as the frontend AnalyticsPage
      const [
        combinedAnalytics,
        userReportData,
        courseCompletionData,
        learningEngagementData,
        loginActivity,
        enrollmentTimeline,
        categoryBreakdown,
        progressDistribution,
        userGrowth,
        roleDistribution,
        activityHeatmap
      ] = await Promise.allSettled([
        reportService.getDashboardAnalytics(),
        reportService.getUserReportData(),
        reportService.getCourseCompletionData(),
        reportService.getLearningEngagementData(),
        reportService.getLoginActivity(),
        reportService.getEnrollmentTimeline(),
        reportService.getCategoryBreakdown(),
        reportService.getProgressDistribution(),
        reportService.getUserGrowth(),
        reportService.getRoleDistribution(),
        reportService.getActivityHeatmap()
      ]);

      const extract = (result) => result.status === 'fulfilled' ? result.value : null;

      // Build the same AnalyticsData shape as the frontend
      const analyticsData = {
        combinedAnalytics: extract(combinedAnalytics),
        userReportData: extract(userReportData),
        courseCompletionData: extract(courseCompletionData),
        learningEngagement: extract(learningEngagementData),
        loginActivity: extract(loginActivity),
        enrollmentTimeline: extract(enrollmentTimeline),
        categoryBreakdown: extract(categoryBreakdown),
        progressDistribution: extract(progressDistribution),
        userGrowth: extract(userGrowth),
        roleDistribution: extract(roleDistribution),
        activityHeatmap: extract(activityHeatmap),
      };

      // Generate the exact same PDF as the frontend Export PDF button
      const pdfBuffer = generateAnalyticsPDFBuffer(analyticsData);

      const fileName = `Analytics_Report_${new Date().toISOString().split('T')[0]}.pdf`;

      // Send email to all recipients
      await emailHelper.sendScheduledReportEmail(
        schedule.recipients,
        'Analytics Report',
        pdfBuffer,
        fileName
      );

      // Mark as sent
      await reportSchedulerService.markAsSent(schedule.id);

      const duration = Date.now() - startTime;
      console.log(`✅ Schedule #${schedule.id} processed in ${duration}ms — sent to ${schedule.recipients.length} recipient(s)`);
    } catch (error) {
      console.error(`❌ Schedule #${schedule.id} failed:`, error.message);
    }
  }

  getStatus() {
    return {
      isRunning: this.isRunning
    };
  }
}

module.exports = new ReportScheduler();
