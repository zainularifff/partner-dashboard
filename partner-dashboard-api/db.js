const sql = require('mssql');
require('dotenv').config();

// 1. Configuration - Parse the JSON array from .env
const clients = process.env.DB_CLIENTS ? JSON.parse(process.env.DB_CLIENTS) : [];

// 2. Registry to store the active Connection Pools
const pools = {
  helpdesk: new Map(),
  tco: new Map()
};

/**
 * Internal helper to get/create a connection pool using client-specific credentials
 */
async function getPool(client, type) {
  const cleanIp = client.ip.trim();
  const dbName = type === 'helpdesk' ? process.env.DB_NAME_HELPDESK : process.env.DB_NAME_TCO;
  const poolKey = `${cleanIp}_${type}`;

  if (!pools[type].has(poolKey)) {
    const config = {
      user: process.env.DB_USER,
      password: client.pass, // ✅ Pulls the specific password from the JSON object
      server: cleanIp,
      database: dbName,
      options: { 
        encrypt: false, 
        trustServerCertificate: true,
        connectTimeout: 10000 
      }
    };
    
    console.log(`[DB] Initializing Pool: ${client.name} (${cleanIp}) -> ${dbName}`);
    pools[type].set(poolKey, new sql.ConnectionPool(config));
  }

  const pool = pools[type].get(poolKey);
  
  if (!pool.connected && !pool.connecting) {
    await pool.connect();
  }
  return pool;
}

/**
 * Logic to query ALL servers defined in DB_CLIENTS
 */
async function queryAllServers(type, queryStr) {
  const promises = clients.map(async (client) => {
    try {
      // ✅ Pass the whole client object to get the correct password
      const pool = await getPool(client, type);
      const result = await pool.request().query(queryStr);
      
      // Tag rows with the Client Name for the Frontend
      return result.recordset.map(row => ({ 
        ...row, 
        origin_server_id: client.name,
        client_name: client.name
      }));
    } catch (err) {
      console.error(`[DB Error] ${client.name} (${client.ip}):`, err.message);
      return []; 
    }
  });

  const results = await Promise.all(promises);
  return results.flat();
}

module.exports = {
  queryAllServers,
  clients
};
