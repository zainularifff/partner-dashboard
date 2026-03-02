const mysql = require('mysql2/promise'); // Untuk Master DB (Local)
const sql = require('mssql');           // Untuk Client DB (Remote)
require('dotenv').config();

let projects = [];
let flatServerList = [];

const pools = {
  helpdesk: new Map(),
  tco: new Map()
};

// 1. INIT CONFIG (Strict Toggle Mode)
async function initConfig() {
  if (process.env.USE_MASTER_DB === 'true') {
    console.log('🚀 [DB] Mode: MASTER DB (MySQL Local)');
    try {
      const masterConn = await mysql.createConnection({
        host: process.env.DB_MASTER_SERVER || 'localhost',
        user: process.env.DB_MASTER_USER || 'root',
        password: process.env.DB_MASTER_PASS || '', 
        database: process.env.DB_MASTER_NAME || 'aism'
      });

      // 🔥 FIX: Tambah kolum 'sector' dalam query SELECT
      const [rows] = await masterConn.execute(`
        SELECT project_name, client_name, server_ip, server_role, sector 
        FROM server_connections WHERE is_active = 1
      `);
      
      projects = rows;
      await masterConn.end();
      buildFlatListFromMaster();
      console.log(`[DB] ✅ Loaded ${flatServerList.length} servers dari MySQL`);
      
    } catch (err) {
      console.error('❌ [DB] Gagal baca Master DB (MySQL):', err.message);
      projects = [];
      flatServerList = [];
    }
  } else {
    console.log('📦 [DB] Mode: STATIC ENV (Backup Mode)');
    try {
      projects = process.env.DB_CLIENTS ? JSON.parse(process.env.DB_CLIENTS) : [];
      buildFlatListFromEnv();
      console.log(`[DB] ✅ Loaded ${flatServerList.length} servers dari .env`);
    } catch (err) {
      console.error('❌ [DB] Gagal baca JSON dari .env:', err.message);
      projects = [];
      flatServerList = [];
    }
  }
}

function buildFlatListFromMaster() {
  flatServerList = projects.map(row => ({
    name: row.client_name || row.project_name,
    projectName: row.project_name,
    ip: row.server_ip,
    type: (row.server_role || 'CLIENT').toLowerCase(),
    // 🔥 FIX: Pegang data sector dari MySQL
    sector: (row.sector || 'OTHERS').toUpperCase() 
  }));
}

function buildFlatListFromEnv() {
  flatServerList = [];
  projects.forEach(proj => {
    flatServerList.push({ 
        name: proj.projectName, 
        projectName: proj.projectName, 
        ip: proj.projectIp, 
        type: 'project',
        sector: (proj.sector || 'OTHERS').toUpperCase() 
    });
    if (proj.clients) {
      proj.clients.forEach(c => {
        flatServerList.push({ 
            name: c.name, 
            projectName: proj.projectName, 
            ip: c.ip, 
            type: 'client',
            sector: (c.sector || 'OTHERS').toUpperCase() 
        });
      });
    }
  });
}

// 2. UNIVERSAL RESOLVER (Cari nama DB secara dinamik)
async function resolveDynamicDbName(client, type) {
  const tempPool = new sql.ConnectionPool({
    user: process.env.DB_USER,
    password: process.env.DB_PASS_DEFAULT,
    server: client.ip,
    port: 1433,
    database: 'master',
    options: { encrypt: false, trustServerCertificate: true, connectTimeout: 5000 }
  });

  try {
    await tempPool.connect();
    const prefix = (type === 'helpdesk') ? 'Helpdesk' : 'TCO';
    
    const query = `
      SELECT TOP 1 name FROM sys.databases 
      WHERE name = '${client.name}' 
         OR name LIKE '${prefix}_${client.name}%' 
         OR name LIKE '${prefix}%'
      ORDER BY CASE WHEN name LIKE '${prefix}_${client.name}%' THEN 1 ELSE 2 END, create_date DESC
    `;

    const result = await tempPool.request().query(query);
    await tempPool.close();

    if (result.recordset.length > 0) {
      return result.recordset[0].name;
    }
    
    return (type === 'helpdesk') ? (process.env.DB_NAME_HELPDESK || 'Helpdesk') : null;
  } catch (err) {
    if (tempPool.connected) await tempPool.close();
    console.error(`⚠️ [Resolver] Gagal detect DB ${type} di ${client.ip}:`, err.message);
    return (type === 'helpdesk') ? 'Helpdesk' : null;
  }
}

// 3. GET POOL (Connect ke MSSQL Client)
async function getPool(client, type) {
  const poolKey = `${client.ip}_${client.name}_${type}`;
  
  if (pools[type].has(poolKey)) {
    const p = pools[type].get(poolKey);
    if (p.connected) return p;
    pools[type].delete(poolKey);
  }
  
  try {
    const dbName = await resolveDynamicDbName(client, type);
    
    if (!dbName && type === 'tco') {
        return null;
    }

    const pool = new sql.ConnectionPool({
      user: process.env.DB_USER,
      password: process.env.DB_PASS_DEFAULT,
      server: client.ip,
      port: 1433,
      database: dbName,
      options: { 
        encrypt: false, 
        trustServerCertificate: true,
        connectTimeout: 15000, 
        requestTimeout: 30000 
      }
    });
    
    await pool.connect();
    console.log(`✅ [${type.toUpperCase()}] Connected: ${client.name} -> DB: ${dbName}`);
    pools[type].set(poolKey, pool);
    return pool;
  } catch (err) {
    console.error(`❌ [${type.toUpperCase()}] Gagal connect ke ${client.name}:`, err.message);
    return null;
  }
}

// 4. QUERY ENGINE
async function querySpecificServers(type, queryStr, filter = '') {
  const servers = filter 
    ? flatServerList.filter(s => filter.split(',').includes(s.name)) 
    : flatServerList;

  const tasks = servers.map(async s => {
    const pool = await getPool(s, type);
    if (!pool) return [];
    try {
      const result = await pool.request().query(queryStr);
      // 🔥 FIX: Sertakan s.sector supaya server.js boleh baca
      return result.recordset.map(r => ({ 
        ...r, 
        serverId: s.name, 
        projectName: s.projectName,
        serverSector: s.sector 
      }));
    } catch (err) { 
      return []; 
    }
  });

  const results = await Promise.allSettled(tasks);
  return results
    .filter(r => r.status === 'fulfilled')
    .flatMap(r => r.value);
}

module.exports = { 
  initConfig, 
  querySpecificServers, 
  queryAllServers: (type, q) => querySpecificServers(type, q), 
  get clients() { return flatServerList; },
  get projects() { return projects; } 
};