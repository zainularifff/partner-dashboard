const sql = require('mssql');
require('dotenv').config();

let projects = [];
let flatServerList = [];

try {
  projects = process.env.DB_CLIENTS ? JSON.parse(process.env.DB_CLIENTS) : [];
  projects.forEach(proj => {
    flatServerList.push({
      name: proj.projectName,
      ip: proj.projectIp,
      pass: "P@ssw0rd", 
      type: 'project'
    });

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
    CREATE / REUSE CONNECTION POOL (INDIVIDUAL DB DETECT)
===================================================== */
// db.js - Versi Paling Stabil
async function getPool(client, type) {
  const cleanIp = client.ip.trim();
  const poolKey = `${cleanIp}_${type}`;

  if (!pools[type].has(poolKey)) {
    console.log(`[DB] Menghubungi ${client.name} (${cleanIp}) buat kali pertama...`);
    
    const baseConfig = {
      user: process.env.DB_USER,
      password: client.pass,
      server: cleanIp,
      database: 'master', 
      options: { encrypt: true, trustServerCertificate: true, connectTimeout: 15000 },
    };

    try {
      const tempPool = await new sql.ConnectionPool(baseConfig).connect();
      
      // ✅ Cari DB secara manual
      const dbCheck = await tempPool.request().query(`
        SELECT TOP 1 name FROM sys.databases 
        WHERE name IN ('TCO3', 'TCO') 
        ORDER BY CASE WHEN name = 'TCO3' THEN 1 ELSE 2 END
      `);
      
      const actualDb = type === 'helpdesk' 
        ? process.env.DB_NAME_HELPDESK 
        : (dbCheck.recordset[0]?.name || 'TCO');

      await tempPool.close();

      const finalPool = new sql.ConnectionPool({
        ...baseConfig,
        database: actualDb,
        requestTimeout: 30000,
      });

      // Simpan pool yang dah diconnect siap-siap
      pools[type].set(poolKey, await finalPool.connect());
      console.log(`[DB] ✅ Server ${client.name} sedia guna database: ${actualDb}`);
    } catch (err) {
      console.error(`[DB Error] ❌ Gagal di ${client.name}:`, err.message);
      return null; // Return null supaya querySpecificServers boleh teruskan ke server lain
    }
  }

  const pool = pools[type].get(poolKey);
  // Pastikan pool masih hidup sebelum return
  if (!pool.connected) await pool.connect();
  return pool;
}

// db.js - Versi Paling Stabil
async function querySpecificServers(type, queryStr, filterId = '') {
  const selectedClients = (filterId && filterId.trim() !== '')
    ? clients.filter(c => filterId.split(',').map(i => i.trim()).includes(c.name))
    : clients;

  console.log(`[DB] Memulakan query pada ${selectedClients.length} server...`);

  const promises = selectedClients.map(async (client) => {
    try {
      const pool = await getPool(client, type);
      const result = await pool.request().query(queryStr);
      
      // Ambil jumlah rekod untuk log terminal
      const rowCount = result.recordset.length;
      console.log(`   ✅ ${client.name}: Berjaya tarik ${rowCount} rekod.`);

      return result.recordset.map(row => ({ ...row, serverId: client.name }));
    } catch (err) {
      console.error(`   ❌ ${client.name} (${client.ip}) GAGAL:`, err.message);
      return [];
    }
  });

  const results = await Promise.all(promises);
  return results.flat(); // Gabungkan semua hasil server menjadi satu array
}

module.exports = { querySpecificServers, queryAllServers: (t, q) => querySpecificServers(t, q, ''), projects, clients };