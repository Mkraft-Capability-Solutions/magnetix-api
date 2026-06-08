const cron = require('node-cron');
const { pool: db } = require('../config/db');
const MarketingService = require('../services/super_admin/marketing_service');

/**
 * Current time as 'YYYY-MM-DD HH:MM:SS' in Asia/Kolkata.
 *
 * marketing_campaigns.scheduled_for stores the IST wall-clock the user picked
 * (a naive DATETIME). Comparing against this string — instead of the DB's
 * NOW() — makes "is it due?" correct regardless of the DB server's timezone.
 */
function nowInIST() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(new Date());
  const get = (t) => (parts.find((p) => p.type === t) || {}).value || '00';
  return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}:${get('second')}`;
}

class MarketingCampaignScheduler {
  constructor() {
    this.job = null;
    this.isRunning = false;
    this.processing = false; // guards against overlapping ticks
  }

  async start() {
    try {
      this.job = cron.schedule('* * * * *', async () => {
        await this.executeJob();
      }, {
        scheduled: false,
        timezone: process.env.TZ || 'Asia/Kolkata'
      });
      this.job.start();
      this.isRunning = true;
      console.log('📣 Marketing campaign scheduler started (checks every minute)');
    } catch (error) {
      console.error('❌ Error starting marketing campaign scheduler:', error);
      throw error;
    }
  }

  stop() {
    try {
      if (this.job) {
        this.job.stop();
        this.job = null;
        this.isRunning = false;
        console.log('📣 Marketing campaign scheduler stopped');
      }
    } catch (error) {
      console.error('❌ Error stopping marketing campaign scheduler:', error);
    }
  }

  getDueCampaigns() {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT uuid
        FROM marketing_campaigns
        WHERE status = 'scheduled'
          AND is_deleted = 0
          AND scheduled_for IS NOT NULL
          AND scheduled_for <= ?
        ORDER BY scheduled_for ASC
        LIMIT 50
      `;
      db.query(query, [nowInIST()], (error, results) => {
        if (error) return reject(error);
        resolve(results || []);
      });
    });
  }

  async executeJob() {
    if (this.processing) return; // a prior run is still in flight
    this.processing = true;
    try {
      const due = await this.getDueCampaigns();
      if (due.length === 0) return;

      console.log(`📣 Found ${due.length} scheduled campaign(s) due to send`);
      for (const row of due) {
        try {
          // sendCampaign flips status scheduled → sending → sent, so a due
          // campaign is only ever picked up once.
          await MarketingService.sendCampaign(row.uuid);
          console.log(`  ✓ sent scheduled campaign ${row.uuid}`);
        } catch (err) {
          // sendCampaign already marks the campaign 'failed' on error.
          console.error(`  ✗ failed scheduled campaign ${row.uuid}:`, err && err.message);
        }
      }
    } catch (error) {
      console.error('❌ Marketing campaign scheduler job error:', error && error.message);
    } finally {
      this.processing = false;
    }
  }
}

module.exports = new MarketingCampaignScheduler();
