require('dotenv').config();
const http = require('http');
const app = require('./src/app');
const { promisePool } = require('./src/config/db');
const { runPendingMigrations } = require('./src/config/run_migrations');
const { ensureSchema, ensureProcedures } = require('./src/config/ensure_schema');
const eventReminderScheduler = require('./src/schedulers/event_reminder_scheduler');
const reportScheduler = require('./src/schedulers/report_scheduler');
const assignmentReminderScheduler = require('./src/schedulers/assignment_reminder_scheduler');
const marketingCampaignScheduler = require('./src/schedulers/marketing_campaign_scheduler');
const byteVideoScheduler = require('./src/schedulers/byte_video_scheduler');
const { initializeSocketIO } = require('./src/socket/socketServer');
const PORT = process.env.PORT || 3000;

// Database connection test
async function testDatabaseConnection() {
  try {
    const connection = await promisePool.getConnection();
    console.log('✅ Database connection established successfully');
    connection.release();
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1); // Exit with failure
  }
}

// Graceful shutdown handler
function setupShutdownHandlers() {
  const shutdown = async (signal) => {
    console.log(`\n${signal} received: shutting down gracefully...`);
    
    try {
      // Stop event reminder scheduler
      eventReminderScheduler.stop();
      assignmentReminderScheduler.stop();
      marketingCampaignScheduler.stop();
      byteVideoScheduler.stop();

      // Close Socket.io connections
      io.close(() => {
        console.log('Socket.IO closed');
      });

      // Close database pool
      await promisePool.end();
      console.log('Database pool closed');

      // Close server
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
      
      // Force shutdown after timeout
      setTimeout(() => {
        console.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 5000);
      
    } catch (error) {
      console.error('Error during shutdown:', error);
      process.exit(1);
    }
  };

  // Handle different shutdown signals
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGQUIT', () => shutdown('SIGQUIT'));
}

// Create HTTP server and initialize Socket.io
const server = http.createServer(app);
const io = initializeSocketIO(server);

// Start the server
server.listen(PORT, async () => {
  console.log(`\n🚀 Server is running on port ${PORT}`);
  console.log(`🔗 http://localhost:${PORT}`);
  console.log(`🔌 Socket.IO initialized for real-time support`);

  // Test database connection on startup
  await testDatabaseConnection();

  // Apply pending DB migrations (Sequelize/Umzug). The runner catches per-migration
  // errors and continues — so a single broken legacy migration can't block boot.
  // The real safety net for required schema is `ensureSchema()` below.
  try {
    const { applied, failed } = await runPendingMigrations();
    if (applied.length > 0) {
      console.log(`✅ Applied ${applied.length} migration(s): ${applied.join(', ')}`);
    } else {
      console.log('✅ Database migrations up-to-date');
    }
    if (failed && failed.length > 0) {
      console.warn(`⚠ ${failed.length} migration(s) skipped due to errors. App will still start; ensureSchema covers required tables.`);
    }
  } catch (err) {
    // Only the runner-level fatal errors land here (e.g., umzug couldn't connect at all).
    console.error('❌ Migration runner crashed on startup:', err);
    process.exit(1);
  }

  // Belt-and-braces schema check. Independent of SequelizeMeta — verifies critical
  // tables actually exist in the DB and creates any that are missing. Protects
  // against a wrong/stale SequelizeMeta state where a migration is recorded as
  // applied but never actually ran.
  try {
    await ensureSchema();
  } catch (err) {
    console.error('❌ Schema verification failed on startup:', err);
    process.exit(1);
  }

  // Stored-procedure self-heal — runs AFTER ensureSchema so the columns the
  // procedures depend on already exist. Independent of SequelizeMeta: reconciles
  // get_user_details / add_course_lesson whenever the DB has a missing or stale
  // version (the drift that repeatedly broke login header + lesson creation).
  // Non-fatal by design — a bad procedure degrades a feature, it shouldn't block
  // the whole app from booting.
  try {
    await ensureProcedures();
  } catch (err) {
    console.error('⚠️  Procedure verification failed on startup (continuing):', err);
  }

  // Start event reminder scheduler
  try {
    await eventReminderScheduler.start();
  } catch (error) {
    console.error('⚠️  Failed to start event reminder scheduler:', error);
  }

  // Start report scheduler
  try {
    await reportScheduler.start();
  } catch (error) {
    console.error('⚠️  Failed to start report scheduler:', error);
  }

  // Start assignment reminder + escalation scheduler
  try {
    await assignmentReminderScheduler.start();
  } catch (error) {
    console.error('⚠️  Failed to start assignment reminder scheduler:', error);
  }

  // Start marketing campaign scheduler (auto-sends scheduled campaigns)
  try {
    await marketingCampaignScheduler.start();
  } catch (error) {
    console.error('⚠️  Failed to start marketing campaign scheduler:', error);
  }

  // Start byte video scheduler (renders queued AI short-videos)
  try {
    await byteVideoScheduler.start();
  } catch (error) {
    console.error('⚠️  Failed to start byte video scheduler:', error);
  }

  // Setup shutdown handlers
  setupShutdownHandlers();
});

// Increase server timeout for large file uploads
server.setTimeout(10 * 60 * 1000); // 10 minutes
server.keepAliveTimeout = 5 * 60 * 1000; // 5 minutes
server.headersTimeout = 6 * 60 * 1000; // 6 minutes

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  server.close(() => process.exit(1));
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  server.close(() => process.exit(1));
});

// Server error handling
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use`);
  } else {
    console.error('Server error:', error);
  }
  process.exit(1);
});