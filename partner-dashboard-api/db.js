const sql = require('mssql');
require('dotenv').config();

let projects = [];
let flatServerList = [];
const pools = { helpdesk: new Map(), tco: new Map() };
const passwordCache = new Map(); 

async function initConfig() {
  try {
    if (process.env.USE_MASTER_DB === 'true') {
      console.log('🚀 [DB] Method 2: Fetching from Master Database...');
      
      const masterConfig = {
        user: process.env.DB_MASTER_USER,
        password: process.env.DB_MASTER_PASS,
        server: process.env.DB_MASTER_SERVER,
        database: process.env.DB_MASTER_NAME,
        options: { encrypt: false, trustServerCertificate: true },
        connectTimeout: 5000
      };

      const masterPool = await new sql.ConnectionPool(masterConfig).connect();
      const result = await masterPool.request().query(`
        SELECT projectName, projectIp, clients_json AS clients, db_user, db_name
        FROM Master_Projects_Table WHERE status = 'ACTIVE'
      `);

      projects = result.recordset.map(row => ({
        projectName: row.projectName,
        projectIp: row.projectIp,
        clients: typeof row.clients === 'string' ? JSON.parse(row.clients) : row.clients,
        dbUser: row.db_user,
        dbName: row.db_name
      }));
      
      await masterPool.close();
    } else {
      console.log('📦 [DB] Method 1: Loading from .env file...');
      projects = process.env.DB_CLIENTS ? JSON.parse(process.env.DB_CLIENTS) : [];
    }

    buildFlatList();
    console.log(`[DB] ✅ Loaded. Total: ${projects.length} projects, ${flatServerList.length} servers.`);
  } catch (err) {
    console.error('⚠️ [DB] Error during init, falling back to .env:', err.message);
    projects = process.env.DB_CLIENTS ? JSON.parse(process.env.DB_CLIENTS) : [];
    buildFlatList();
  }
}

function buildFlatList() {
  flatServerList = [];
  projects.forEach(proj => {
    flatServerList.push({
      name: proj.projectName,
      ip: proj.projectIp,
      pass: proj.projectPass || "1W0rldtech",
      type: 'project'
    });

    if (proj.clients && Array.isArray(proj.clients)) {
      proj.clients.forEach(c => {
        flatServerList.push({
          name: c.name,
          ip: c.ip,
          pass: c.pass || "1W0rldtech",
          type: 'client'
        });
      });
    }
  });
}

async function getPool(client, type) {
  if (!pools[type]) throw new Error(`Invalid pool type: ${type}`);
  const cleanIp = client.ip.trim();
  const poolKey = `${cleanIp}_${type}`;

  if (pools[type].has(poolKey)) {
    const existingPool = pools[type].get(poolKey);
    if (existingPool.connected) return existingPool;
    pools[type].delete(poolKey);
  }

  const passwordsToTry = [client.pass, "1W0rldtech", "P@ssw0rd"].filter(Boolean);
  
  // 🔥 Kita senaraikan semua kemungkinan nama database
  const dbsToTry = type === 'helpdesk' 
    ? [process.env.DB_NAME_HELPDESK || 'HelpdeskDB'] 
    : ['TCO', 'TCO3', 'TCO_LIVE'];

  for (const pass of passwordsToTry) {
    for (const dbName of dbsToTry) {
      const pool = new sql.ConnectionPool({
        user: process.env.DB_USER || 'sa',
        password: pass,
        server: cleanIp,
        database: dbName, // 🔥 Dia pusing dngn TCO, pastu TCO3
        options: { 
          encrypt: false, 
          trustServerCertificate: true, 
          connectTimeout: 10000 
        },
        pool: { max: 10, min: 0, idleTimeoutMillis: 30000 }
      });

      try {
        await pool.connect();
        console.log(`✅ [DB] Connected to ${cleanIp} using Database: ${dbName}`);
        pools[type].set(poolKey, pool);
        return pool;
      } catch (err) {
        // Kita tutup pool dlu sebelum cuba dbName seterusnya dlm loop
        await pool.close().catch(() => {});
        continue; 
      }
    }
  }
  return null;
}

// WAJIB ADA: Fungsi engine query kau
// Gantikan fungsi ini dlm db.js kau
async function querySpecificServers(type, queryStr, filterId = '') {
  const selectedClients = (filterId && filterId.trim() !== '')
    ? flatServerList.filter(c => filterId.split(',').map(i => i.trim()).includes(c.name))
    : flatServerList;

  // DEBUG: Tengok berapa server yang Node.js cuba panggil
  console.log(`📡 [DB DEBUG] Mencari dlm ${selectedClients.length} server:`, selectedClients.map(c => c.name));

  const promises = selectedClients.map(async (client) => {
    try {
      const pool = await getPool(client, type);
      if (!pool) {
        console.error(`❌ [DB DEBUG] Gagal connect ke server: ${client.name}`);
        return [];
      }

      const result = await pool.request().query(queryStr);
      return result.recordset.map(row => ({
        ...row,
        serverId: client.name,
        projectName: client.projectName, // 🔥 WAJIB ADA UNTUK MAPPING SEKTOR
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

// WAJIB ADA: Fungsi untuk build flat list dari projects dan clients
function buildFlatList() {
  flatServerList = [];
  projects.forEach(proj => {
    // 1. Masukkan Server Project Utama
    flatServerList.push({
      name: proj.projectName,
      projectName: proj.projectName, // <--- TAMBAH NI: Supaya dia tahu dia parent
      ip: proj.projectIp,
      pass: proj.projectPass || "1W0rldtech",
      type: 'project'
    });

    // 2. Masukkan Server Client di bawah projek
    if (proj.clients && Array.isArray(proj.clients)) {
      proj.clients.forEach(c => {
        flatServerList.push({
          name: c.name,
          projectName: proj.projectName, // <--- TAMBAH NI: Supaya client ni tahu bapa dia siapa
          ip: c.ip,
          pass: c.pass || "1W0rldtech",
          type: 'client'
        });
      });
    }
  });
}

module.exports = {
  initConfig,
  querySpecificServers,
  queryAllServers: (type, query) => querySpecificServers(type, query, ''),
  get projects() { return projects; },
  get clients() { return flatServerList; }
};