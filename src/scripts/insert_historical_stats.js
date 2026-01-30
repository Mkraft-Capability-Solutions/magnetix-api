const dashboardService = require('../services/admin/dashboard_service');

/**
 * Insert historical dashboard stats for the last 10 days (excluding today)
 * This script helps populate historical data for testing
 */
async function insertHistoricalStats() {
  try {
    console.log('Starting to insert historical dashboard stats...\n');

    const results = [];
    const today = new Date();

    // Loop through last 10 days (excluding today)
    for (let i = 1; i <= 10; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      console.log(`Processing date: ${dateStr}...`);

      try {
        const result = await dashboardService.calculateAndSaveDailyStats(date);

        results.push({
          date: dateStr,
          success: true,
          data: result.data
        });

        console.log(`✓ Successfully saved stats for ${dateStr}`);
        console.log(`  - Active Learners: ${result.data.active_learners}`);
        console.log(`  - Courses in Progress: ${result.data.courses_in_progress}`);
        console.log(`  - Overdue Assignments: ${result.data.overdue_assignments}`);
        console.log(`  - Pending Approvals: ${result.data.pending_approvals}`);
        console.log('');
      } catch (error) {
        console.error(`✗ Failed to save stats for ${dateStr}:`, error.message);
        results.push({
          date: dateStr,
          success: false,
          error: error.message
        });
      }
    }

    console.log('\n========================================');
    console.log('Summary:');
    console.log('========================================');
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    console.log(`Total dates processed: ${results.length}`);
    console.log(`Successful: ${successful}`);
    console.log(`Failed: ${failed}`);
    console.log('========================================\n');

    // Exit with appropriate code
    process.exit(failed > 0 ? 1 : 0);

  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Run the script
insertHistoricalStats();
