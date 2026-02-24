const sql = require('mssql');
require('dotenv').config();

// 1. Configuration - Parse the JSON array dari .env
const clients = process.env.DB_CLIENTS ? JSON.parse(process.env.DB_CLIENTS) : [];

// 2. Registry untuk simpan Connection Pools
const pools = {
  helpdesk: new Map(),
  tco: new Map(),
};

/**
 * Helper untuk create connection pool berdasarkan IP & Database yang betul
 */
async function getPool(client, type) {
  const cleanIp = client.ip.trim();

  // Tentukan nama DB secara dinamik (TCO3 prioritised)
  const dbName =
    type === 'helpdesk'
      ? process.env.DB_NAME_HELPDESK
      : process.env.DB_NAME_TCO3 || process.env.DB_NAME_TCO;

  const poolKey = `${cleanIp}_${type}`;

  if (!pools[type].has(poolKey)) {
    const config = {
      user: process.env.DB_USER,
      password: client.pass,
      server: cleanIp,
      database: dbName,
      options: {
        encrypt: false,
        trustServerCertificate: true,
        connectTimeout: 10000,
      },
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
 * ✅ FUNGSI UTAMA: Query server SPESIFIK (Master Filter)
 */
async function querySpecificServers(type, queryStr, filterId = '') {
  // 1. Log untuk debug (Tengok kat terminal nodejs kau)
  console.log(`[DB] Filter Received: "${filterId}"`);

  // 2. Tapis senarai clients
  const selectedClients = filterId 
    ? clients.filter(c => {
        // Kita pecahkan string (cth: "Client_A,Client_B")
        const filterList = filterId.split(',').map(item => item.trim());
        
        // Kita check match dengan c.name
        // Tip: Kalau frontend hantar "Client_A" tapi .env kau "A", 
        // kita buat check yang lebih fleksibel
        return filterList.includes(c.name) || 
               filterList.includes(`Client_${c.name}`) ||
               filterList.includes(c.serverId);
      }) 
    : clients;

  // 3. Log untuk confirm server mana yang akan di-query
  console.log(`[DB] Querying ${selectedClients.length} servers:`, selectedClients.map(c => c.name));

  if (selectedClients.length === 0) {
    console.warn(`[DB Warning] No matching servers found for filter: ${filterId}`);
    return [];
  }

  const promises = selectedClients.map(async (client) => {
    try {
      const pool = await getPool(client, type);
      const result = await pool.request().query(queryStr);

      return result.recordset.map((row) => ({
        ...row,
        serverId: client.name,
        origin_server_id: client.name,
        client_name: client.name,
      }));
    } catch (err) {
      console.error(`[DB Error] ${client.name}:`, err.message);
      return [];
    }
  });

  const results = await Promise.all(promises);
  return results.flat();
}


/**
 * Kekalkan fungsi asal untuk backward compatibility jika perlu
 */
async function queryAllServers(type, queryStr) {
  return querySpecificServers(type, queryStr, '');
}

module.exports = {
  querySpecificServers,
  queryAllServers,
  clients,
};
