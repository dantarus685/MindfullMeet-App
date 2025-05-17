// config/database.js
require('dotenv').config();

module.exports = {
  development: {
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'mindfulmeet',
    host: process.env.DB_HOST || 'localhost',
    dialect: 'mysql',
    port: process.env.DB_PORT || 3306,
    logging: false,
    pool: {
      max: 5,  // Maximum number of connection in pool
      min: 0,  // Minimum number of connection in pool
      acquire: 60000, // Increased time to acquire a connection
      idle: 10000,    // Increased idle time before a connection is released
      evict: 1000,    // How frequently to check for idle connections
    },
    retry: {
      max: 3, // Maximum retry attempts
    },
    dialectOptions: {
      connectTimeout: 60000, // Increased connection timeout
    }
  },
  // Other environments remain the same...
  test: {
    // ...
  },
  production: {
    // ...
  }
};