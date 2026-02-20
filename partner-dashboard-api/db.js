const sql = require('mssql');
require('dotenv').config();

// 1️⃣ HELPDESK POOLS (The missing ones causing your error)
const pool70 = new sql.ConnectionPool({
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  server: process.env.DB_SERVER_A,
  database: process.env.DB_NAME_A_HELPDESK,
  options: { encrypt: false, trustServerCertificate: true }
});

const pool51 = new sql.ConnectionPool({
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  server: process.env.DB_SERVER_B,
  database: process.env.DB_NAME_B_HELPDESK,
  options: { encrypt: false, trustServerCertificate: true }
});

// 2️⃣ TCO POOLS (For your Asset counting)
const poolTCO70 = new sql.ConnectionPool({
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  server: process.env.DB_SERVER_A,
  database: process.env.DB_NAME_A_TCO, // TCO3
  options: { encrypt: false, trustServerCertificate: true }
});

const poolTCO51 = new sql.ConnectionPool({
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  server: process.env.DB_SERVER_B,
  database: process.env.DB_NAME_B_TCO, // TCO
  options: { encrypt: false, trustServerCertificate: true }
});

// 3️⃣ SHARED CONNECTION HANDLER
async function getConnection(pool) {
  if (!pool) throw new Error("Database pool is undefined. Check your exports in db.js.");
  if (!pool.connected && !pool.connecting) {
    await pool.connect();
  }
  return pool;
}

// 4️⃣ EXPORT EVERYTHING (Matches your server.js imports)
module.exports = {
  pool70, 
  pool51,
  poolTCO70,
  poolTCO51,
  getConnection
};
