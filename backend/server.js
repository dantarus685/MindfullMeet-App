// server.js - Clean HTTP server startup only
require('dotenv').config();
const { server } = require('./app');
const db = require('./models');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    console.log('🔗 Connecting to database...');
    await db.sequelize.authenticate();
    console.log('✅ Database connected successfully');
    
    console.log('📊 Syncing database models...');
    await db.sequelize.sync();
    console.log('✅ Database models synced successfully');
    
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🌐 Local: http://localhost:${PORT}`);
      console.log(`🌐 Network: http://192.168.1.146:${PORT}`);
      console.log(`📡 Socket.IO ready for connections`);
      console.log(`🔍 Health check: http://192.168.1.146:${PORT}/health`);
    });
  } catch (err) {
    console.error('❌ Server startup error:', err.message);
    console.log('🔄 Retrying in 5 seconds...');
    setTimeout(startServer, 5000);
  }
};

// Graceful shutdown
const gracefulShutdown = (signal) => {
  console.log(`\n📡 Received ${signal}. Shutting down gracefully...`);
  
  server.close((err) => {
    if (err) {
      console.error('❌ Error during server shutdown:', err);
      process.exit(1);
    }
    
    console.log('✅ Server closed successfully');
    
    // Close database connection
    db.sequelize.close()
      .then(() => {
        console.log('✅ Database connection closed');
        process.exit(0);
      })
      .catch((err) => {
        console.error('❌ Error closing database:', err);
        process.exit(1);
      });
  });
  
  // Force close after 10 seconds
  setTimeout(() => {
    console.log('⚠️ Forcing server shutdown');
    process.exit(1);
  }, 10000);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle unhandled errors
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Promise Rejection:', err.message);
  console.error(err);
});

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err.message);
  console.error(err);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

// Start the server
startServer();