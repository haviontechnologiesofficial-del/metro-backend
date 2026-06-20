require('dotenv').config();
const app = require('./app');
const { testDbConnection } = require('./config/database');
const autoMigrate = require('./utils/autoMigrate.util');
const logger = require('./utils/logger.util');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // 1. Authenticate Database (creates DB if not exists + initializes pool)
    await testDbConnection();

    // 2. Auto-create all tables if they don't exist
    await autoMigrate();

    // 3. Start HTTP Listener
    app.listen(PORT, () => {
      logger.info(`===================================================`);
      logger.info(`  Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
      logger.info(`  Access API: http://localhost:${PORT}`);
      logger.info(`===================================================`);
    });
  } catch (error) {
    logger.error('Failed to start the Express server:', error);
    process.exit(1);
  }
};

startServer();
