const sql = require('mssql');
require('dotenv').config();

const baseConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME, // Note: Use DB_NAME_A / DB_NAME_B if they differ
  options: {
    encrypt: true,
    trustServerCertificate: true
  }
};

// Setup Pool for .70
const pool70 = new sql.ConnectionPool({ 
  ...baseConfig, 
  server: process.env.DB_SERVER_A, // 192.168.140.70
  database: 'helpdesk' 
});

// Setup Pool for .51
const pool51 = new sql.ConnectionPool({ 
  ...baseConfig, 
  server: process.env.DB_SERVER_B, // 192.168.140.51
  database: 'Helpdesk' 
});

module.exports = {
  pool70, 
  pool51,
  getConnection: async (pool) => {
    if (!pool) throw new Error("Database pool is undefined. Check your exports in db.js.");
    if (!pool.connected) await pool.connect();
    return pool;
  }
};
