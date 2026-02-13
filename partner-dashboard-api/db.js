const sql = require('mssql');

const config = {
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

const pool = new sql.ConnectionPool(config);
const poolConnect = pool.connect();

module.exports = { sql, pool, poolConnect };


// const sql = require('mssql');
// require('dotenv').config();

// /* ===== HELPDESK ===== */

// const hdConfig = {
//   server: process.env.DB_HD_SERVER,
//   database: process.env.DB_HD_NAME,
//   user: process.env.DB_HD_USER,
//   password: process.env.DB_HD_PASS,
//   options: {
//     encrypt: false,
//     trustServerCertificate: true
//   }
// };

// const hdPool = new sql.ConnectionPool(hdConfig);
// const hdPoolConnect = hdPool.connect();


// /* ===== TCO3 ===== */

// const tcoConfig = {
//   server: process.env.DB_TCO_SERVER,
//   database: process.env.DB_TCO_NAME,
//   user: process.env.DB_TCO_USER,
//   password: process.env.DB_TCO_PASS,
//   options: {
//     encrypt: false,
//     trustServerCertificate: true
//   }
// };

// const tcoPool = new sql.ConnectionPool(tcoConfig);
// const tcoPoolConnect = tcoPool.connect();


// module.exports = {
//   sql,
//   hdPool,
//   hdPoolConnect,
//   tcoPool,
//   tcoPoolConnect
// };
