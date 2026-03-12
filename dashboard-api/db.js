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

let pool = null;

async function getPool() {
    if (!pool) {
        try {
            console.log('🔄 Connecting to MSSQL...');
            pool = await sql.connect(config);
            console.log('✅ Connected to MSSQL successfully');
        } catch (err) {
            console.error('❌ Connection failed:', err.message);
            throw err;
        }
    }
    return pool;
}

async function query(queryStr, params = {}) {
    try {
        const pool = await getPool();
        const request = pool.request();
        
        // Add parameters if any
        Object.keys(params).forEach(key => {
            request.input(key, params[key]);
        });
        
        const result = await request.query(queryStr);
        return result.recordset;
    } catch (err) {
        console.error('❌ Query error:', err.message);
        throw err;
    }
}

module.exports = {
    query,
    getPool
};