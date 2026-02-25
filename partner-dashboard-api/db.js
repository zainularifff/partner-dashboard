const sql = require('mssql');
require('dotenv').config();

let projects = [];
let flatServerList = [];

try {
  // 1. Ambil data client dari .env
  projects = process.env.DB_CLIENTS ? JSON.parse(process.env.DB_CLIENTS) : [];

  projects.forEach(proj => {
    // Masukkan server projek utama
    flatServerList.push({
      name: proj.projectName,
      ip: proj.projectIp,
      pass: "P@ssw0rd", // 💡 Tips: Sebaiknya letak dlm .env juga
      type: 'project'
    });

    // Masukkan server client di bawah projek
    if (proj.clients && Array.isArray(proj.clients)) {
      proj.clients.forEach(c => {
        flatServerList.push({
          name: c.name,
          ip: c.ip,
          pass: "P@ssw0rd",
          type: 'client'
        });
      });
    }
  });
} catch (err) {
  console.error('[DB Config Error] Invalid DB_CLIENTS JSON:', err.message);
  process.exit(1);
}

const clients = Object.freeze(flatServerList);
const pools = { helpdesk: new Map(), tco: new Map() };

/* =====================================================
   🔌 CREATE / REUSE CONNECTION POOL
===================================================== */
async function getPool(client, type) {
  const cleanIp = client.ip.trim();
  const poolKey = `${cleanIp}_${type}`;

  if (!pools[type].has(poolKey)) {
    // ✅ OPTIMASI: Kita terus sambung ke DB sasaran tanpa perlu "Double Connect"
    const baseConfig = {
      user: process.env.DB_USER,
      password: client.pass,
      server: cleanIp,
      // Jika Helpdesk, terus ke DB Helpdesk. Jika TCO, kita guna 'master' supaya SQL boleh scan TCO/TCO3 secara Union
      database: type === 'helpdesk' ? process.env.DB_NAME_HELPDESK : 'master',
      options: {
        encrypt: false, // Set false jika server lokal Petronas
        trustServerCertificate: true,
        connectTimeout: 10000,
      },
      requestTimeout: 60000 // Tingkatkan sikit sbb Union query mungkin berat
    };

    try {
      console.log(`[DB] 🔄 Connecting to ${client.name} (${cleanIp})...`);
      const pool = new sql.ConnectionPool(baseConfig);
      const connectedPool = await pool.connect();

      connectedPool.on('error', err => {
        console.error(`[SQL ERROR] ${client.name}:`, err.message);
      });

      pools[type].set(poolKey, connectedPool);
      console.log(`[DB] ✅ ${client.name} is ready.`);
    } catch (err) {
      console.error(`[DB ERROR] ❌ ${client.name} failed:`, err.message);
      return null;
    }
  }

  const pool = pools[type].get(poolKey);
  if (!pool.connected) await pool.connect();
  return pool;
}

/* =====================================================
   🔎 QUERY MULTIPLE SERVERS (WITH OPTIONAL FILTER)
===================================================== */
async function querySpecificServers(type, queryStr, filterId = '') {
  // Filter mengikut nama (Project_A, Client_B, etc.)
  const selectedClients = (filterId && filterId.trim() !== '')
    ? clients.filter(c => filterId.split(',').map(i => i.trim()).includes(c.name))
    : clients;

  const promises = selectedClients.map(async (client) => {
    try {
      const pool = await getPool(client, type);
      if (!pool) return [];

      const result = await pool.request().query(queryStr);
      
      // ✅ Inject serverId & serverType untuk logic mapping sektor dlm server.js
      return result.recordset.map(row => ({
        ...row,
        serverId: client.name,
        serverType: client.type
      }));

    } catch (err) {
      console.error(`   ❌ ${client.name} query failed:`, err.message);
      return [];
    }
  });

  const results = await Promise.allSettled(promises);

  return results
    .filter(r => r.status === 'fulfilled')
    .map(r => r.value)
    .flat();
}

/* =====================================================
   EXPORT
===================================================== */
module.exports = {
  querySpecificServers,
  queryAllServers: (type, query) => querySpecificServers(type, query, ''),
  projects,
  clients
};