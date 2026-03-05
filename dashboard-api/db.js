const sql = require('mssql');
require('dotenv').config();

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    server: process.env.DB_SERVER, 
    database: process.env.DB_NAME,
    options: {
        encrypt: false, 
        trustServerCertificate: true,
        connectTimeout: 30000
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    }
};

let poolPromise = null;

// 1. INIT CONFIG
async function initConfig() {
    if (!poolPromise) {
        console.log('🚀 [DB] Connecting to Natalie\'s Consolidated MSSQL...');
        poolPromise = new sql.ConnectionPool(config)
            .connect()
            .then(pool => {
                console.log('[DB] Connected to MSSQL (aism) Successfully!');
                return pool;
            })
            .catch(err => {
                console.error('[DB] Connection Failed:', err.message);
                poolPromise = null;
                throw err;
            });
    }
    return poolPromise;
}

async function queryDatabase(queryStr) {
    try {
        const pool = await initConfig();
        const result = await pool.request().query(queryStr);
        return result.recordset; 
    } catch (err) {
        console.error('❌ [Query Error]:', err.message);
        return [];
    }
}

module.exports = { 
    initConfig, 
    queryDatabase,
    // Alias untuk kekalkan compatibility dengan server.js lama kau
    queryAllServers: (type, q) => queryDatabase(q),
    querySpecificServers: (type, q) => queryDatabase(q)
};