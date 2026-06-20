const mysql = require('mysql2/promise');
const config = require('./config')[process.env.NODE_ENV || 'development'];
const winston = require('../utils/logger.util');

// Module-level pool reference - updated after initPool() is called
// Exported as a plain property so that destructured imports (const { pool } = require(...))
// get the reference by value, which will be updated once initialized.
const database = {
  _pool: null,

  get pool() {
    return this._pool;
  },

  set pool(p) {
    this._pool = p;
  }
};

winston.info(`Connecting to database ${config.database} on host ${config.host}...`);

/**
 * Ensure the database exists - creates it if not present
 */
const ensureDatabaseExists = async () => {
  try {
    const connectionOpts = {
      host: config.host,
      port: config.port,
      user: config.username,
      password: config.password
    };
    const socketPath = config.socketPath || process.env.DB_SOCKET_PATH;
    if (socketPath) {
      connectionOpts.socketPath = socketPath;
    }
    const connection = await mysql.createConnection(connectionOpts);
    await connection.execute(
      `CREATE DATABASE IF NOT EXISTS \`${config.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
    );
    await connection.end();
    winston.info(`Database "${config.database}" ensured.`);
  } catch (error) {
    winston.error('Unable to create/verify database:', error);
    throw error;
  }
};

/**
 * Initialize the connection pool (must be called after ensureDatabaseExists)
 */
const initPool = () => {
  const poolOpts = {
    host: config.host,
    port: config.port,
    user: config.username,
    password: config.password,
    database: config.database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    timezone: 'Z'
  };
  const socketPath = config.socketPath || process.env.DB_SOCKET_PATH;
  if (socketPath) {
    poolOpts.socketPath = socketPath;
  }
  database._pool = mysql.createPool(poolOpts);
};

/**
 * Test the database connection
 */
const testDbConnection = async () => {
  try {
    // 1. Ensure database exists first
    await ensureDatabaseExists();

    // 2. Initialize the pool now that the database exists
    initPool();

    // 3. Test the connection
    const connection = await database._pool.getConnection();
    await connection.ping();
    connection.release();
    winston.info('Database connection has been established successfully.');
  } catch (error) {
    winston.error('Unable to connect to the database:', error);
    process.exit(1);
  }
};

database.testDbConnection = testDbConnection;
database.ensureDatabaseExists = ensureDatabaseExists;

module.exports = database;
