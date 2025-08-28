require('dotenv').config();
const app = require('./src/app');
const { promisePool } = require('./src/config/db');
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

// Start the server
const server = app.listen(PORT, async () => {
  console.log(`\n🚀 Server is running on port ${PORT}`);
  console.log(`🔗 http://localhost:${PORT}`);
  
  // Test database connection on startup
  await testDatabaseConnection();
  
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