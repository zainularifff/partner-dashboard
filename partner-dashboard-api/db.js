const sql = require('mssql');
require('dotenv').config();

let projects = [];
let flatServerList = [];
const pools = { helpdesk: new Map(), tco: new Map(), master: null };

/**
 * 🚀 FUNGSI UTAMA: Inisialisasi Konfigurasi
 * Dipanggil oleh server.js sebelum app.listen()
 */
async function initConfig() {
  try {
    // 1️⃣ SEMAK METHOD 2: Guna Master DB jika diaktifkan
    if (process.env.USE_MASTER_DB === 'true') {
      console.log('🚀 [DB] Method 2: Fetching from Master Database...');
      
      const masterConfig = {
        user: process.env.DB_MASTER_USER,
        password: process.env.DB_MASTER_PASS,
        server: process.env.DB_MASTER_SERVER,
        database: process.env.DB_MASTER_NAME,
        options: { encrypt: false, trustServerCertificate: true }
      };

      const masterPool = await new sql.ConnectionPool(masterConfig).connect();
      
      // Tarik data berdasarkan column names yang kau tetapkan
      const result = await masterPool.request().query(`
        SELECT 
          projectName, 
          projectIp, 
          clients_json AS clients,
          db_user AS DB_USER,
          db_name AS DB_NAME
        FROM Master_Projects_Table 
        WHERE status = 'ACTIVE'
      `);

      projects = result.recordset.map(row => ({
        projectName: row.projectName,
        projectIp: row.projectIp,
        clients: JSON.parse(row.clients || '[]'),
        dbUser: row.DB_USER,
        dbName: row.DB_NAME
      }));
      
      await masterPool.close();
    } 
    // 2️⃣ FALLBACK KE METHOD 1: .env Static
    else {
      console.log('📦 [DB] Method 1: Loading from .env file...');
      projects = process.env.DB_CLIENTS ? JSON.parse(process.env.DB_CLIENTS) : [];
    }

    // 3️⃣ BINA FLAT SERVER LIST (Untuk kegunaan getPool)
    buildFlatList();
    
    console.log(`[DB] ✅ Configuration loaded. Total Projects: ${projects.length}`);
  } catch (err) {
    console.error('⚠️ [DB] Master DB Failed, falling back to .env:', err.message);
    projects = process.env.DB_CLIENTS ? JSON.parse(process.env.DB_CLIENTS) : [];
    buildFlatList();
  }
}

function buildFlatList() {
  flatServerList = [];
  projects.forEach(proj => {
    // Masukkan server projek utama
    flatServerList.push({
      name: proj.projectName,
      ip: proj.projectIp,
      pass: "P@ssw0rd", // Boleh juga ditarik dinamik dari column DB_PASS dlm Master DB
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
}

/* =====================================================
    🔌 CREATE / REUSE CONNECTION POOL
===================================================== */
async function getPool(client, type) {
  const cleanIp = client.ip.trim();
  const poolKey = `${cleanIp}_${type}`;

  if (!pools[type].has(poolKey)) {
    const baseConfig = {
      user: process.env.DB_USER, // Boleh di-override dengan proj.dbUser jika guna Method 2
      password: client.pass,
      server: cleanIp,
      database: type === 'helpdesk' ? process.env.DB_NAME_HELPDESK : 'master',
      options: {
        encrypt: false,
        trustServerCertificate: true,
        connectTimeout: 10000,
      },
      requestTimeout: 60000
    };

    try {
      const pool = new sql.ConnectionPool(baseConfig);
      const connectedPool = await pool.connect();
      pools[type].set(poolKey, connectedPool);
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
    🔎 QUERY ENGINE
===================================================== */
async function querySpecificServers(type, queryStr, filterId = '') {
  // Gunakan flatServerList yang sudah di-init dinamik
  const selectedClients = (filterId && filterId.trim() !== '')
    ? flatServerList.filter(c => filterId.split(',').map(i => i.trim()).includes(c.name))
    : flatServerList;

  const promises = selectedClients.map(async (client) => {
    try {
      const pool = await getPool(client, type);
      if (!pool) return [];

      const result = await pool.request().query(queryStr);
      return result.recordset.map(row => ({
        ...row,
        serverId: client.name,
        serverType: client.type
      }));
    } catch (err) {
      return [];
    }
  });

  const results = await Promise.allSettled(promises);
  return results
    .filter(r => r.status === 'fulfilled')
    .map(r => r.value)
    .flat();
}

module.exports = {
  initConfig, // ✅ Wajib panggil dlm server.js
  querySpecificServers,
  queryAllServers: (type, query) => querySpecificServers(type, query, ''),
  get projects() { return projects; },
  get clients() { return flatServerList; }
};