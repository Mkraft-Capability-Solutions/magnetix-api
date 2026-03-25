const repository = require("../../repositories/admin/reportAnalyticsRepository");
const reportGenerator = require("../../utils/report_generator");
const logger = require("../../config/logger");
const AppError = require("../../utils/appError");

const CATEGORY_COLORS = ["#6366f1", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6"];
const ROLE_NAMES = { 1: "Student", 2: "Instructor", 3: "Admin", 4: "Super Admin" };
const ROLE_COLORS = { Student: "#3b82f6", Instructor: "#10b981", Admin: "#f59e0b", "Super Admin": "#8b5cf6" };

class ReportAnalyticsService {
  // ============================================================================
  // ANALYTICS DATA METHODS
  // ============================================================================

  async getLeaderboard(limit = 50) {
    return repository.getLeaderboard(null, limit);
  }

  async getDepartmentPerformance() {
    return repository.getDepartmentPerformance(null);
  }

  async getCompletionTrends() {
    return repository.getCompletionTrends(null);
  }

  async getCertificationDistribution() {
    return repository.getCertificationDistribution();
  }

  async getUserReportData(fromDate = null, toDate = null, department = null) {
    return repository.getUserReportData(null, fromDate, toDate, department);
  }

  async getCourseCompletionData(fromDate = null, toDate = null) {
    return repository.getCourseCompletionData(fromDate, toDate);
  }

  async getLearningEngagementData(fromDate = null, toDate = null) {
    return repository.getLearningEngagementData(null, fromDate, toDate);
  }

  async getSkillsAssessmentData() {
    return repository.getSkillsAssessmentData(null);
  }

  async getLoginActivity() {
    return repository.getLoginActivity();
  }

  async getEnrollmentTimeline() {
    return repository.getEnrollmentTimeline();
  }

  async getCategoryBreakdown() {
    const rows = await repository.getCategoryBreakdown();
    return rows.map((row, i) => ({
      ...row,
      color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
    }));
  }

  async getProgressDistribution() {
    return repository.getProgressDistribution();
  }

  async getUserGrowth() {
    return repository.getUserGrowth();
  }

  async getRoleDistribution() {
    const rows = await repository.getRoleDistribution();
    return rows.map((row) => {
      const roleName = ROLE_NAMES[row.role_id] || `Role ${row.role_id}`;
      return {
        role: roleName,
        count: row.count,
        color: ROLE_COLORS[roleName] || "#6b7280",
      };
    });
  }

  async getActivityHeatmap() {
    return repository.getActivityHeatmap();
  }

  // ============================================================================
  // COMBINED DASHBOARD
  // ============================================================================

  async getDashboardAnalytics() {
    const [leaderboard, departmentPerformance, completionTrends, certificationDistribution] =
      await Promise.all([
        this.getLeaderboard(10),
        this.getDepartmentPerformance(),
        this.getCompletionTrends(),
        this.getCertificationDistribution(),
      ]);

    return { leaderboard, departmentPerformance, completionTrends, certificationDistribution };
  }

  // ============================================================================
  // REPORT GENERATION
  // ============================================================================

  async generateReport(reportType, format, options = {}) {
    const { data, title } = await this._getReportData(reportType, options);

    const result = await reportGenerator.generateReport(
      reportType,
      format,
      title,
      data,
      options
    );

    return {
      ...result,
      recordCount: Array.isArray(data) ? data.length : 1,
    };
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  async _getReportData(reportType, options) {
    switch (reportType) {
      case "user":
        return {
          title: "User Report",
          data: await this.getUserReportData(
            options.dateRange?.from,
            options.dateRange?.to,
            options.department
          ),
        };

      case "course-completion":
        return {
          title: "Course Completion Report",
          data: await this.getCourseCompletionData(
            options.dateRange?.from,
            options.dateRange?.to
          ),
        };

      case "learning-engagement": {
        const engagementData = await this.getLearningEngagementData(
          options.dateRange?.from,
          options.dateRange?.to
        );
        const data = engagementData
          ? [
              { metric: "Total Active Users", value: engagementData.totalActiveUsers },
              { metric: "Users with Enrollments", value: engagementData.usersWithEnrollments },
              { metric: "Total Enrollments", value: engagementData.totalEnrollments },
              { metric: "Total Time Spent (minutes)", value: engagementData.totalTimeSpentMinutes },
              { metric: "Average Time per User (minutes)", value: engagementData.avgTimePerUser },
              { metric: "Active Last Week", value: engagementData.activeLastWeek },
            ]
          : [];
        return { title: "Learning Engagement Report", data };
      }

      case "skills-assessment":
        return {
          title: "Skills Assessment Report",
          data: await this.getSkillsAssessmentData(),
        };

      default:
        throw new AppError(`Unknown report type: ${reportType}`, 400);
    }
  }
}

module.exports = new ReportAnalyticsService();
