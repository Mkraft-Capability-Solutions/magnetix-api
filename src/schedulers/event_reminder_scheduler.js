const cron = require('node-cron');
const eventReminderService = require('../services/event_reminder_service');

class EventReminderScheduler {
    constructor() {
        this.job = null;
        this.isRunning = false;
    }

    // Start the cron job for event reminders
    async start() {
        try {
            // Schedule to run every day at 9:00 AM
            // Cron pattern: '0 9 * * *' means "at minute 0 of hour 9, every day"
            // You can customize this time based on your requirements
            const cronPattern = process.env.REMINDER_CRON_SCHEDULE || '0 9 * * *';
            
            this.job = cron.schedule(cronPattern, async () => {
                await this.executeReminderJob();
            }, {
                scheduled: false, // Don't start immediately
                timezone: process.env.TZ || 'America/New_York' // Set your timezone
            });

            // Start the scheduled job
            this.job.start();
            this.isRunning = true;
            
            console.log(`📧 Event reminder scheduler started`);
            console.log(`📅 Scheduled to run: ${cronPattern} (${process.env.TZ || 'America/New_York'})`);
            console.log(`⏰ Next execution: ${this.getNextExecutionTime()}`);

            // Run immediately on startup to catch any events within 48 hours
            console.log(`🚀 Running initial event reminder check on startup...`);
            setTimeout(async () => {
                try {
                    await this.executeReminderJob();
                } catch (error) {
                    console.error('❌ Initial reminder run failed:', error);
                }
            }, 5000); // Wait 5 seconds after startup to ensure all services are ready
            
        } catch (error) {
            console.error('❌ Error starting event reminder scheduler:', error);
            throw error;
        }
    }

    // Stop the cron job
    stop() {
        try {
            if (this.job) {
                this.job.stop();
                this.job = null;
                this.isRunning = false;
                console.log('📧 Event reminder scheduler stopped');
            }
        } catch (error) {
            console.error('❌ Error stopping event reminder scheduler:', error);
        }
    }

    // Execute the reminder job
    async executeReminderJob() {
        const startTime = new Date();
        console.log(`\n🔔 Starting event reminder job at ${startTime.toISOString()}`);
        
        try {
            // Process all events that need reminders
            const result = await eventReminderService.processEventReminders();
            
            const endTime = new Date();
            const duration = endTime - startTime;
            
            // Log summary
            console.log(`\n📊 Event Reminder Job Summary:`);
            console.log(`   • Total events processed: ${result.totalEvents}`);
            console.log(`   • Successful email sends: ${result.totalSuccessfulSends}`);
            console.log(`   • Failed email sends: ${result.totalFailedSends}`);
            console.log(`   • Job duration: ${duration}ms`);
            console.log(`   • Completed at: ${endTime.toISOString()}`);
            
            // Log individual event results
            if (result.results.length > 0) {
                console.log(`\n📝 Event Details:`);
                result.results.forEach(eventResult => {
                    if (eventResult.skipped) {
                        console.log(`   ⏭️  ${eventResult.eventTitle || 'Unknown Event'}: Skipped (${eventResult.reason})`);
                    } else if (eventResult.failed) {
                        console.log(`   ❌ ${eventResult.eventTitle}: Failed - ${eventResult.error}`);
                    } else {
                        console.log(`   ✅ ${eventResult.eventTitle}: ${eventResult.successfulSends} sent, ${eventResult.failedSends} failed`);
                    }
                });
            }
            
            console.log(`⏰ Next scheduled execution: ${this.getNextExecutionTime()}\n`);
            
        } catch (error) {
            const endTime = new Date();
            const duration = endTime - startTime;
            
            console.error(`\n❌ Event reminder job failed after ${duration}ms:`);
            console.error(`   Error: ${error.message}`);
            console.error(`   Stack: ${error.stack}`);
            console.log(`⏰ Next scheduled execution: ${this.getNextExecutionTime()}\n`);
            
            // Don't throw the error - let the cron job continue running
        }
    }

    // Get the next execution time as a readable string
    getNextExecutionTime() {
        if (!this.job) return 'Not scheduled';
        
        try {
            // This is a simplified calculation - in production you might want to use a more robust solution
            const now = new Date();
            const tomorrow9AM = new Date(now);
            tomorrow9AM.setDate(now.getDate() + 1);
            tomorrow9AM.setHours(9, 0, 0, 0);
            
            return tomorrow9AM.toLocaleString();
        } catch (error) {
            return 'Unable to determine';
        }
    }

    // Get scheduler status
    getStatus() {
        return {
            isRunning: this.isRunning,
            nextExecution: this.getNextExecutionTime(),
            cronPattern: process.env.REMINDER_CRON_SCHEDULE || '0 9 * * *',
            timezone: process.env.TZ || 'America/New_York'
        };
    }

    // Manual trigger for testing (bypasses cron schedule)
    async triggerManually() {
        console.log('🔧 Manual trigger of event reminder job...');
        await this.executeReminderJob();
    }

    // Trigger reminder for specific event (for testing)
    async triggerForEvent(eventId) {
        console.log(`🔧 Manual trigger for specific event: ${eventId}`);
        
        try {
            const result = await eventReminderService.triggerManualReminder(eventId);
            
            console.log(`📊 Manual Reminder Result for Event ${eventId}:`);
            if (result.skipped) {
                console.log(`   ⏭️  Skipped: ${result.reason}`);
            } else {
                console.log(`   ✅ Event: ${result.eventTitle}`);
                console.log(`   📧 Emails sent: ${result.successfulSends}`);
                console.log(`   ❌ Emails failed: ${result.failedSends}`);
                
                if (result.errors && result.errors.length > 0) {
                    console.log(`   🚨 Errors:`);
                    result.errors.forEach(error => console.log(`      - ${error}`));
                }
            }
            
            return result;
            
        } catch (error) {
            console.error(`❌ Manual reminder trigger failed:`, error);
            throw error;
        }
    }
}

// Export a singleton instance
module.exports = new EventReminderScheduler();